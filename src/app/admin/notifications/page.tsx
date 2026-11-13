import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/server/session";
import { listNotifications } from "@/lib/server/notify";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ResendButton } from "../bookings/[id]/BookingControls";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };
export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "All" }, { value: "failed", label: "Failed" }, { value: "skipped", label: "Not sent" },
  { value: "queued", label: "Queued" }, { value: "sent", label: "Sent" },
];
const dt = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function AdminNotificationsPage({ searchParams }: { searchParams: { status?: string } }) {
  await requireStaff("/admin/notifications");
  const status = FILTERS.some((f) => f.value === searchParams.status) ? searchParams.status : "";
  const rows = await listNotifications({ status: status || undefined, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Messages</h1>
        <p className="mt-2 text-muted">Every WhatsApp, SMS and Telegram message the system tried to send, newest first. &quot;Not sent&quot; usually means the channel isn&apos;t set up yet.</p>
      </div>
      <nav aria-label="Filter messages" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.value} href={f.value ? `/admin/notifications?status=${f.value}` : "/admin/notifications"}
            className={`inline-flex min-h-11 items-center rounded-pill border px-4 text-sm font-semibold ${status === f.value ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-foreground"}`}>
            {f.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <Card className="p-8 text-center text-muted">No messages here.</Card> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">To</th>
                <th className="px-4 py-3 font-semibold">Booking</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((n) => (
                <tr key={n.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3">{dt(n.createdAt)}</td>
                  <td className="px-4 py-3"><p className="font-medium">{n.event}</p><p className="text-xs text-muted">{n.audience} · {n.channel}</p></td>
                  <td className="break-all px-4 py-3 text-xs">{n.recipient}</td>
                  <td className="px-4 py-3">{n.bookingId ? <Link className="font-mono text-xs font-semibold text-primary" href={`/admin/bookings/${n.bookingId}`}>{n.reference}</Link> : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={n.status} />{n.lastError && <p className="mt-1 max-w-[240px] break-words text-xs text-danger">{n.lastError}</p>}</td>
                  <td className="px-4 py-3"><ResendButton notificationId={n.id} bookingId={n.bookingId} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
