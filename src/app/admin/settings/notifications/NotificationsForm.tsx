"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  AUDIENCE_LABEL, CHANNEL_LABEL, EVENT_AUDIENCES, channelsFor, placeholders, recipientField, routeField, templateField, type FormValues,
} from "@/lib/admin/notifications-form";
import { CHANNELS, type ChannelName } from "@/lib/notifications/types";
import { saveNotificationsAction } from "./actions";

const areaClass = "block w-full rounded-md border bg-surface p-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function NotificationsForm({ initial, defaults, connected }: {
  initial: FormValues; defaults: Record<string, string>; connected: Record<ChannelName, boolean>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(initial).filter(([k]) => k.startsWith("tpl:"))));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveNotificationsAction(data);
      if (res.ok) { setErrors({}); setStatus({ ok: true, text: "Saved. New messages use these settings now." }); }
      else { setErrors(res.errors); setStatus({ ok: false, text: res.message }); }
    });
  }
  const err = (k: string) => errors[k] && <span className="mt-1 block text-sm text-danger">{errors[k]}</span>;
  const check = (name: string, label: string, hint?: string) => (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={initial[name] === "on"} className="h-5 w-5 accent-primary" />
      <span className="text-sm font-medium">{label}{hint && <span className="ml-2 font-normal text-muted">{hint}</span>}</span>
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card className="p-6 md:p-8">
        <h2 className="text-xl font-semibold">On or off</h2>
        <div className="mt-4 space-y-1">
          {check("enabled", "Send notifications", "Untick to stop every message (useful while testing).")}
          {CHANNELS.map((c) => (
            <div key={c}>{check(`channel:${c}`, `Use ${CHANNEL_LABEL[c]}`, connected[c] ? "Connected." : "Not connected yet: its keys aren't set, so messages are logged as not sent.")}</div>
          ))}
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <h2 className="text-xl font-semibold">Who gets staff messages</h2>
        <p className="mt-1 text-sm text-muted">One per line. Phones as +91 98xxxxxxxx (or 10 digits). Telegram as a chat id (a number) or @channel. Guests are reached on the phone they booked with.</p>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {(["operator", "kitchen"] as const).map((a) => (
            <div key={a} className="space-y-4">
              <h3 className="font-semibold">{AUDIENCE_LABEL[a]}</h3>
              {CHANNELS.map((c) => {
                const f = recipientField(a, c);
                return (
                  <label key={f} className="block">
                    <span className="mb-1 block text-sm font-medium">{CHANNEL_LABEL[c]}</span>
                    <textarea name={f} defaultValue={initial[f]} rows={2} aria-invalid={!!errors[f]} className={`${areaClass} ${errors[f] ? "border-danger" : "border-border"}`} />
                    {err(f)}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <h2 className="text-xl font-semibold">What goes where</h2>
        <p className="mt-1 text-sm text-muted">Tick the channels for each message and each recipient.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr><th className="py-2 pr-4 font-semibold">Message</th><th className="py-2 font-semibold">Send to</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EVENT_AUDIENCES.map(({ event, label, audiences }) => (
                <tr key={event} className="align-top">
                  <td className="py-3 pr-4 font-medium">{label}</td>
                  <td className="py-3">
                    <div className="space-y-1">
                      {audiences.map((a) => (
                        <div key={a} className="flex flex-wrap items-center gap-x-4">
                          <span className="w-32 text-muted">{AUDIENCE_LABEL[a]}</span>
                          {channelsFor(a).map((c) => (
                            <label key={c} className="flex min-h-11 cursor-pointer items-center gap-2">
                              <input type="checkbox" name={routeField(event, a, c)} defaultChecked={initial[routeField(event, a, c)] === "on"} className="h-5 w-5 accent-primary" />
                              {CHANNEL_LABEL[c]}
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <h2 className="text-xl font-semibold">Message wording</h2>
        <p className="mt-1 text-sm text-muted">Words in {"{{double braces}}"} are filled in for each booking. On WhatsApp, *stars* make bold. Messages the business starts after 24 hours of silence need a Meta-approved WhatsApp template; those are set up separately.</p>
        <div className="mt-4 divide-y divide-border">
          {EVENT_AUDIENCES.flatMap(({ event, label, audiences }) => audiences.map((a) => {
            const f = templateField(event, a);
            const def = defaults[`${event}.${a}`] ?? "";
            const changed = (texts[f] ?? "").trim() !== def.trim();
            return (
              <details key={f} className="py-3">
                <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
                  {label} → {AUDIENCE_LABEL[a]}{changed && <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-xs text-primary">edited</span>}
                </summary>
                <textarea name={f} rows={5} value={texts[f] ?? ""} onChange={(e) => setTexts((t) => ({ ...t, [f]: e.target.value }))}
                  aria-invalid={!!errors[f]} className={`${areaClass} mt-2 font-mono ${errors[f] ? "border-danger" : "border-border"}`}
                  placeholder={def ? undefined : "No default wording. Add text, or this message isn't sent."} />
                {err(f)}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                  {def && <span>Uses: {placeholders(def).map((p) => `{{${p}}}`).join(" ")}</span>}
                  {changed && def && <button type="button" className="min-h-11 font-semibold text-primary" onClick={() => setTexts((t) => ({ ...t, [f]: def }))}>Reset to default</button>}
                </div>
              </details>
            );
          }))}
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <label className="block max-w-sm">
          <span className="mb-1.5 block text-sm font-medium">Balance reminders (days before check-out)</span>
          <input name="balanceReminderDaysBefore" defaultValue={initial.balanceReminderDaysBefore}
            className={`block h-12 w-full rounded-md border bg-surface px-3.5 text-base ${errors.balanceReminderDaysBefore ? "border-danger" : "border-border"}`} />
          <span className="mt-1 block text-xs text-muted">For example &ldquo;1, 0&rdquo;: the day before and the morning of check-out.</span>
          {err("balanceReminderDaysBefore")}
        </label>
      </Card>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-raised">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save notifications"}</Button>
        {status && <p role="status" className={`text-sm ${status.ok ? "text-success" : "text-danger"}`}>{status.text}</p>}
        {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
      </div>
    </form>
  );
}
