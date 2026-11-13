import "server-only";
import { db } from "./db";
import { getSettings } from "./settings-repo";
import { channels } from "@/lib/notifications/channels";
import { planDeliveries, type PlannedDelivery } from "@/lib/notifications/plan";
import { bookingVars, type BookingForMessage } from "@/lib/notifications/context";
import type { NotificationEvent, TemplateVars } from "@/lib/notifications/types";
import type { AppSettings } from "@/lib/settings";

const MAX_ATTEMPTS = 5;
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Fire an event. Plans deliveries from settings, writes each to the
 * `notifications` outbox (deduped by dedupeKey), then sends. NEVER throws —
 * a notification failure must not break a booking or payment. Failed rows are
 * retried by /api/cron/notifications.
 */
export async function notify(
  event: NotificationEvent,
  opts: { booking?: BookingForMessage & { id: string }; vars?: TemplateVars; dedupeKey?: string } = {},
): Promise<void> {
  try {
    const settings = await getSettings();
    const vars = { ...(opts.booking ? bookingVars(opts.booking, settings, siteUrl()) : {}), ...opts.vars };
    const planned = planDeliveries({ event, vars, settings, guestPhone: opts.booking?.guestPhone });
    if (planned.length === 0) return;

    const sql = db();
    const rows: { id: string; d: PlannedDelivery }[] = [];
    for (const d of planned) {
      const dedupe = opts.dedupeKey ? `${opts.dedupeKey}:${d.audience}:${d.channel}:${d.to}` : null;
      const [row] = await sql<{ id: string }[]>`
        insert into notifications (event, audience, channel, recipient, booking_id, body, vars, status, last_error, dedupe_key)
        values (${event}, ${d.audience}, ${d.channel}, ${d.to}, ${opts.booking?.id ?? null}, ${d.text}, ${sql.json(vars)},
                ${d.skipReason ? "skipped" : "queued"}, ${d.skipReason ?? null}, ${dedupe})
        on conflict (dedupe_key) do nothing
        returning id`;
      if (!row) continue; // already sent for this dedupe key
      if (d.skipReason) {
        if (process.env.NODE_ENV !== "production") console.info(`[notify] skipped ${event} → ${d.audience}/${d.channel}: ${d.skipReason}\n${d.text}`);
        continue;
      }
      rows.push({ id: row.id, d });
    }
    await Promise.allSettled(rows.map(({ id, d }) => deliver(id, d, settings)));
  } catch (err) {
    console.error(`[notify] ${event} failed`, err);
  }
}

async function deliver(id: string, d: PlannedDelivery, settings: AppSettings) {
  const sql = db();
  try {
    const res = await channels[d.channel].send(d, { settings });
    await sql`update notifications set status = 'sent', attempts = attempts + 1, sent_at = now(),
              provider_message_id = ${res.providerMessageId ?? null}, last_error = null where id = ${id}`;
  } catch (err) {
    await sql`update notifications set status = 'failed', attempts = attempts + 1,
              last_error = ${String((err as Error).message ?? err).slice(0, 1000)} where id = ${id}`;
  }
}

/**
 * Staff "resend" from the admin: sends the stored message again to the same
 * recipient on the same channel, and updates that row. Returns the new status.
 */
export async function resendNotification(id: string): Promise<{ status: string; error: string | null }> {
  const settings = await getSettings();
  const sql = db();
  const [r] = await sql<{ event: NotificationEvent; audience: PlannedDelivery["audience"]; channel: PlannedDelivery["channel"]; recipient: string; body: string; vars: TemplateVars }[]>`
    select event, audience, channel, recipient, body, vars from notifications where id = ${id}`;
  if (!r) return { status: "missing", error: "Notification not found." };
  if (!channels[r.channel]?.isConfigured()) {
    await sql`update notifications set status = 'skipped', last_error = ${`${r.channel} is not configured`} where id = ${id}`;
    return { status: "skipped", error: `${r.channel} isn't set up yet, so nothing was sent.` };
  }
  await deliver(id, { event: r.event, audience: r.audience, channel: r.channel, to: r.recipient, text: r.body, vars: r.vars }, settings);
  const [after] = await sql<{ status: string; last_error: string | null }[]>`select status, last_error from notifications where id = ${id}`;
  return { status: after.status, error: after.last_error };
}

export interface NotificationLogRow {
  id: string; event: string; audience: string; channel: string; recipient: string; status: string;
  attempts: number; lastError: string | null; bookingId: string | null; reference: string | null; createdAt: Date;
}

/** Latest notifications for the admin log, optionally filtered by status. */
export async function listNotifications(filter: { status?: string; limit?: number } = {}): Promise<NotificationLogRow[]> {
  const rows = await db()<{ id: string; event: string; audience: string; channel: string; recipient: string; status: string; attempts: number; last_error: string | null; booking_id: string | null; reference: string | null; created_at: Date }[]>`
    select n.id, n.event, n.audience, n.channel, n.recipient, n.status, n.attempts, n.last_error, n.booking_id, b.reference, n.created_at
    from notifications n left join bookings b on b.id = n.booking_id
    where (${filter.status ?? null}::text is null or n.status::text = ${filter.status ?? null})
    order by n.created_at desc limit ${filter.limit ?? 100}`;
  return rows.map((r) => ({
    id: r.id, event: r.event, audience: r.audience, channel: r.channel, recipient: r.recipient, status: r.status,
    attempts: r.attempts, lastError: r.last_error, bookingId: r.booking_id, reference: r.reference, createdAt: r.created_at,
  }));
}

/** Retry failed/stuck notifications (called by cron). */
export async function retryNotifications(limit = 50): Promise<{ retried: number }> {
  const settings = await getSettings();
  const sql = db();
  const rows = await sql<{ id: string; event: NotificationEvent; audience: PlannedDelivery["audience"]; channel: PlannedDelivery["channel"]; recipient: string; body: string; vars: TemplateVars }[]>`
    select id, event, audience, channel, recipient, body, vars from notifications
    where status in ('failed', 'queued') and attempts < ${MAX_ATTEMPTS} and created_at < now() - interval '1 minute'
    order by created_at limit ${limit}`;
  await Promise.allSettled(
    rows.map((r) => deliver(r.id, { event: r.event, audience: r.audience, channel: r.channel, to: r.recipient, text: r.body, vars: r.vars }, settings)),
  );
  return { retried: rows.length };
}
