import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings-repo";
import { listAllRooms } from "@/lib/server/catalog-repo";
import { todayInTz } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Rooms", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  await requireAdmin("/admin/rooms");
  const rooms = await listAllRooms(todayInTz((await getSettings()).property.timezone));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Rooms</h1>
          <p className="mt-2 text-muted">Prices, photos and who can stay. Price changes apply to new bookings only.</p>
        </div>
        <Link href="/admin/rooms/new" className="inline-flex min-h-11 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground">Add a room</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rooms.map((r) => (
          <Link key={r.id} href={`/admin/rooms/${r.id}`} className="block rounded-card border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{r.name}</p>
              {!r.active && <span className="rounded-pill bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">hidden</span>}
            </div>
            <p className="mt-1 text-sm text-muted">{formatINR(Math.round(r.basePrice * 100))}/night · up to {r.maxOccupancy} guests · {r.photos.length} photo{r.photos.length === 1 ? "" : "s"}</p>
            <p className="mt-1 text-xs text-muted">{r.upcomingBookings} upcoming booking{r.upcomingBookings === 1 ? "" : "s"}</p>
          </Link>
        ))}
        {rooms.length === 0 && <Card className="p-8 text-center text-muted md:col-span-2">No rooms yet. Add the first one.</Card>}
      </div>
    </div>
  );
}
