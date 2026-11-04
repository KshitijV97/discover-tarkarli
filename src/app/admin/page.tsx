import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings-repo";
import { getDashboardCounts } from "@/lib/server/admin-repo";
import { addDays, todayInTz } from "@/lib/dates";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireStaff();
  const settings = await getSettings();
  const today = todayInTz(settings.property.timezone);
  const counts = await getDashboardCounts(today, addDays(today, 7));

  const tiles = [
    { label: "Arrivals today", value: counts.arrivalsToday },
    { label: "In house now", value: counts.inHouse },
    { label: "Arrivals next 7 days", value: counts.arrivalsNext7Days },
    { label: "Pending holds", value: counts.pendingHolds },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Overview</h1>
        <p className="mt-2 text-muted">Signed in as {user.email}. Today is {today} ({settings.property.timezone}).</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-2 font-heading text-3xl font-semibold">{t.value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/bookings" className="rounded-card border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5">
          <p className="font-semibold">Bookings</p>
          <p className="mt-1 text-sm text-muted">Filter by date, see payment status and guest details.</p>
        </Link>
        {user.role === "admin" && (
          <Link href="/admin/settings" className="rounded-card border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5">
            <p className="font-semibold">Settings</p>
            <p className="mt-1 text-sm text-muted">Deposit, meal prices, GST, booking rules and property details.</p>
          </Link>
        )}
      </div>
    </div>
  );
}
