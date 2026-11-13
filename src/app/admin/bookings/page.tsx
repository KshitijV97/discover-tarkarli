import type { Metadata } from "next";
import { requireStaff } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings-repo";
import { listBookingsInRange } from "@/lib/server/admin-repo";
import { addDays, formatDate, isISODate, todayInTz } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };
export const dynamic = "force-dynamic";


export default async function AdminBookingsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  await requireStaff("/admin/bookings");
  const settings = await getSettings();
  const today = todayInTz(settings.property.timezone);
  const from = isISODate(searchParams.from) ? searchParams.from : today;
  const to = isISODate(searchParams.to) && searchParams.to > from ? searchParams.to : addDays(from, 30);
  const rows = await listBookingsInRange(from, to);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Bookings</h1>
          <p className="mt-2 text-muted">Stays that overlap {formatDate(from)} to {formatDate(to)}.</p>
        </div>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">From</span>
            <input type="date" name="from" defaultValue={from} className="h-11 rounded-md border border-border bg-surface px-3 text-foreground" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">To</span>
            <input type="date" name="to" defaultValue={to} className="h-11 rounded-md border border-border bg-surface px-3 text-foreground" />
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground">Show</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted">No bookings in this range.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Guest</th>
                <th className="px-4 py-3 font-semibold">Stay</th>
                <th className="px-4 py-3 font-semibold">Rooms</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="px-4 py-3 font-mono text-xs"><Link href={`/admin/bookings/${b.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline">{b.reference}</Link></td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.guestName}</p>
                    <p className="text-xs text-muted">{b.guestPhone} · {b.numGuests} guest{b.numGuests > 1 ? "s" : ""}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                  <td className="px-4 py-3">{b.rooms || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatINR(b.total)}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>Deposit {formatINR(b.deposit)} · {b.depositPaid ? "paid" : "unpaid"}</p>
                    <p className="text-muted">Balance {b.balancePaid ? "paid" : "due at property"}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
