import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings-repo";
import { getAdminBooking } from "@/lib/server/admin-bookings";
import { staffActions, METHOD_LABEL, type ManualMethod } from "@/lib/admin/booking-ops";
import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { mealLabel } from "@/lib/booking/meals";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PriceSummary } from "@/components/booking/PriceSummary";
import { NotesForm, RecordPayment, ResendButton, StatusActions } from "./BookingControls";
import { StayEditor } from "./StayEditor";
import { ManageMeals } from "@/components/booking/ManageMeals";
import { listAllRooms } from "@/lib/server/catalog-repo";
import { saveMealsAction } from "./actions";

export const metadata: Metadata = { title: "Booking", robots: { index: false } };
export const dynamic = "force-dynamic";

const dt = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export default async function AdminBookingPage({ params }: { params: { id: string } }) {
  await requireStaff(`/admin/bookings/${params.id}`);
  const [data, settings] = await Promise.all([getAdminBooking(params.id), getSettings()]);
  if (!data) notFound();
  const { booking: b, summary, payments, notifications, audit, notes, today } = data;
  const paidMeals = b.meals.filter((m) => m.quantity > 0);
  const editable = ["pending", "confirmed", "checked_in"].includes(b.status);
  const bookedIds = new Set(b.rooms.map((r) => r.roomId));
  const roomOptions = editable ? (await listAllRooms(today)).filter((r) => r.active || bookedIds.has(r.id)).map((r) => ({
    id: r.id, name: r.name, maxOccupancy: r.maxOccupancy, hidden: !r.active,
    pricePerNight: b.rooms.find((x) => x.roomId === r.id)?.pricePerNight ?? Math.round(r.basePrice * 100),
  })) : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/bookings" className="text-sm font-semibold text-primary">← All bookings</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{b.guestName}</h1>
          <StatusBadge status={b.status} />
        </div>
        <p className="mt-2 text-muted">
          <span className="font-mono text-sm">{b.reference}</span> · {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.numGuests} guest{b.numGuests > 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)]">
        <div className="min-w-0 space-y-6">
          <Section title="Actions">
            <StatusActions bookingId={b.id} options={staffActions({ status: b.status, checkIn: b.checkIn, checkOut: b.checkOut }, today)} />
          </Section>

          {editable && (
            <Section title="Dates and rooms">
              <StayEditor bookingId={b.id} checkIn={b.checkIn} checkOut={b.checkOut} arrived={b.status === "checked_in"}
                rooms={roomOptions} current={b.rooms.map((r) => ({ roomId: r.roomId, guests: r.guests }))} />
            </Section>
          )}

          {editable && (
            <Section title="Meals">
              <p className="mb-4 text-sm text-muted">Staff can change meals at any time, including after the guest cutoff. Booked meals keep their price.</p>
              <ManageMeals key={`${b.checkIn}-${b.checkOut}-${b.numGuests}`} booking={JSON.parse(JSON.stringify(b))} settings={settings} editable serverNow={new Date().toISOString()}
                saveMeals={saveMealsAction.bind(null, b.id)} bypassCutoff />
            </Section>
          )}

          <Section title="Payments">
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div><dt className="text-muted">Total</dt><dd className="mt-1 font-semibold">{formatINR(summary.total)}</dd></div>
              <div><dt className="text-muted">Paid</dt><dd className="mt-1 font-semibold">{formatINR(summary.paid)}</dd></div>
              <div><dt className="text-muted">Due</dt>{["cancelled", "expired"].includes(b.status)
                ? <dd className="mt-1 font-semibold text-muted">—</dd>
                : <dd className={`mt-1 font-semibold ${summary.balance > 0 ? "text-warning" : "text-success"}`}>{formatINR(summary.balance)}</dd>}</div>
            </dl>
            {summary.refundDue > 0 && (
              <p className="mt-3 rounded-md bg-danger/10 p-3 text-sm text-danger">{formatINR(summary.refundDue)} was paid after the room was taken. Refund it to the guest.</p>
            )}
            {payments.length > 0 && (
              <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{formatINR(p.amount)} · {p.kind} · {p.provider === "manual" ? METHOD_LABEL[p.method as ManualMethod] ?? p.method : p.provider}</p>
                      <p className="text-xs text-muted">{dt(p.paidAt ?? p.createdAt)}{p.recordedBy ? ` · by ${p.recordedBy}` : ""}{p.note ? ` · ${p.note}` : ""}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold">Record a payment taken at the property</h3>
              {["cancelled", "expired"].includes(b.status)
                ? <p className="text-sm text-muted">Payments can&apos;t be recorded on a {b.status} booking.</p>
                : <RecordPayment bookingId={b.id} balance={summary.balance} />}
            </div>
          </Section>

          <Section title="Staff notes"><NotesForm bookingId={b.id} notes={notes} /></Section>

          <Section title="Messages">
            {notifications.length === 0 ? <p className="text-sm text-muted">No messages for this booking yet.</p> : (
              <ul className="divide-y divide-border text-sm">
                {notifications.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{n.event} → {n.audience} · {n.channel}</p>
                      <p className="break-all text-xs text-muted">{n.recipient} · {dt(n.createdAt)}{n.attempts ? ` · ${n.attempts} attempt${n.attempts > 1 ? "s" : ""}` : ""}</p>
                      {n.lastError && <p className="mt-1 break-words text-xs text-danger">{n.lastError}</p>}
                    </div>
                    <div className="flex items-center gap-2"><StatusBadge status={n.status} /><ResendButton notificationId={n.id} bookingId={b.id} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-6">
          <Section title="Guest">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted">Phone</dt><dd className="font-medium"><a className="text-primary" href={`tel:${b.guestPhone}`}>{b.guestPhone}</a></dd></div>
              <div><dt className="text-muted">Email</dt><dd className="break-all font-medium">{b.guestEmail}</dd></div>
              <div><dt className="text-muted">Booked</dt><dd className="font-medium">{dt(b.createdAt)}</dd></div>
            </dl>
          </Section>
          <Section title="Rooms and meals">
            <ul className="space-y-1 text-sm">
              {b.rooms.map((r) => <li key={r.roomId}>{r.name} · {r.guests} guest{r.guests > 1 ? "s" : ""} · {formatINR(r.pricePerNight)}/night</li>)}
            </ul>
            {paidMeals.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                {paidMeals.map((m) => <li key={`${m.date}-${m.mealType}`}>{formatDate(m.date)} · {mealLabel(m.mealType)} × {m.quantity}{m.includedFree ? " (included)" : ""}</li>)}
              </ul>
            )}
            <div className="mt-4 border-t border-border pt-4">
              <PriceSummary quote={b.quote} checkIn={b.checkIn} checkOut={b.checkOut} intraState={settings.tax.intraState} compact />
            </div>
          </Section>
          <Section title="History">
            {audit.length === 0 ? <p className="text-sm text-muted">No staff changes yet.</p> : (
              <ul className="space-y-2 text-sm">
                {audit.map((a) => (
                  <li key={a.id}><span className="font-medium">{a.action.replace("booking.", "").replace("payment.manual", "payment recorded").replace("_", " ")}</span>
                    <span className="text-muted"> · {a.actorEmail} · {dt(a.createdAt)}</span></li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
