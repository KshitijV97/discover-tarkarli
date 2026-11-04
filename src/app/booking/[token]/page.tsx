import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBookingByToken } from "@/lib/server/bookings";
import { getSettings } from "@/lib/server/settings-repo";
import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { ManageMeals } from "@/components/booking/ManageMeals";
import { PayDeposit } from "@/components/booking/PayDeposit";
import { getPaymentProvider } from "@/lib/payments";
import { Aurora } from "@/components/fx/Aurora";
import { SuccessCheck } from "@/components/fx/SuccessCheck";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Awaiting deposit", tone: "bg-warning/15 text-warning" },
  confirmed: { label: "Confirmed", tone: "bg-success/15 text-success" },
  checked_in: { label: "Checked in", tone: "bg-primary-soft text-primary" },
  checked_out: { label: "Checked out", tone: "bg-surface-muted text-muted" },
  cancelled: { label: "Cancelled", tone: "bg-danger/10 text-danger" },
  expired: { label: "Expired", tone: "bg-danger/10 text-danger" },
};

export default async function BookingPage({ params, searchParams }: { params: { token: string }; searchParams: { new?: string; pay?: string } }) {
  const [booking, settings] = await Promise.all([getBookingByToken(params.token), getSettings()]);
  if (!booking) notFound();
  const status = STATUS[booking.status];
  const editable = ["pending", "confirmed", "checked_in"].includes(booking.status);
  const canPayOnline = !!getPaymentProvider() && !booking.depositPaid && ["pending", "confirmed"].includes(booking.status);

  return (
    <div className="container-page space-y-6 pb-10 pt-24">
      {searchParams.new && (
        <div className="relative overflow-hidden rounded-card bg-ink p-6 text-ink-foreground shadow-raised">
          <Aurora className="opacity-70" />
          <div className="relative flex items-start gap-4">
          <SuccessCheck />
          <div>
          <p className="text-sm opacity-90">{booking.status === "pending" ? "Almost done — pay the deposit to confirm" : "Booking received"}</p>
          <h1 className="text-2xl font-semibold">Thank you, {booking.guestName.split(" ")[0]}!</h1>
          <p className="mt-1 text-sm opacity-90">
            Save this page — it&apos;s your private link to view your booking and change meals.
          </p>
          </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Booking reference</p>
                <p className="font-heading text-2xl font-semibold tracking-wide">{booking.reference}</p>
              </div>
              <span className={`rounded-pill px-3 py-1 text-sm font-semibold ${status.tone}`}>{status.label}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Check-in</dt><dd className="font-medium">{formatDate(booking.checkIn)}<br /><span className="text-muted">from {settings.booking.checkInTime}</span></dd></div>
              <div><dt className="text-muted">Check-out</dt><dd className="font-medium">{formatDate(booking.checkOut)}<br /><span className="text-muted">by {settings.booking.checkOutTime}</span></dd></div>
              <div><dt className="text-muted">Guests</dt><dd className="font-medium">{booking.numGuests}</dd></div>
              <div><dt className="text-muted">Rooms</dt><dd className="font-medium">{booking.rooms.map((r) => r.name).join(", ")}</dd></div>
            </dl>
          </Card>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Meals</h2>
            <ManageMeals booking={JSON.parse(JSON.stringify(booking))} settings={settings} editable={editable} serverNow={new Date().toISOString()} />
          </section>
        </div>

        <aside>
          <Card className="space-y-3 p-5 text-sm lg:sticky lg:top-20">
            <h2 className="text-lg font-semibold">Payment</h2>
            <div className="flex justify-between"><span>Total (incl. GST)</span><span className="font-semibold tabular-nums">{formatINR(booking.quote.total)}</span></div>
            <div className="flex justify-between">
              <span>Deposit</span>
              <span className="tabular-nums">{formatINR(booking.quote.deposit)} {booking.depositPaid ? <span className="text-success">· paid</span> : <span className="text-warning">· due</span>}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance at property</span>
              <span className="tabular-nums">{formatINR(booking.quote.balance)} {booking.balancePaid && <span className="text-success">· paid</span>}</span>
            </div>
            {canPayOnline ? (
              <PayDeposit
                token={booking.accessToken}
                amount={booking.quote.deposit}
                pending={booking.status === "pending"}
                expiresAt={booking.expiresAt ? booking.expiresAt.toISOString() : null}
                autoOpen={searchParams.pay === "1"}
              />
            ) : !booking.depositPaid && booking.status === "confirmed" ? (
              <p className="rounded-md bg-surface-muted p-3 text-xs text-muted">Our team will contact you to collect the deposit.</p>
            ) : null}
            {booking.status === "expired" && (
              <p className="rounded-md bg-danger/10 p-3 text-xs text-danger">This booking expired because the deposit wasn&apos;t paid in time. Please make a new booking.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
