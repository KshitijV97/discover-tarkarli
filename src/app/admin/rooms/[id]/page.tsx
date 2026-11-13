import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings-repo";
import { getRoomForEdit } from "@/lib/server/catalog-repo";
import { ROOM_FIELDS, roomToForm } from "@/lib/admin/catalog-forms";
import { todayInTz } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { CatalogForm } from "@/components/admin/CatalogForm";
import { saveRoomAction } from "../../catalog-actions";

export const metadata: Metadata = { title: "Edit room", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminRoomEditPage({ params }: { params: { id: string } }) {
  await requireAdmin(`/admin/rooms/${params.id}`);
  const isNew = params.id === "new";
  const room = isNew ? null : await getRoomForEdit(params.id, todayInTz((await getSettings()).property.timezone));
  if (!isNew && !room) notFound();
  const save = saveRoomAction.bind(null, room?.id ?? null);
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{room ? room.name : "Add a room"}</h1>
        {room && room.upcomingBookings > 0 && (
          <p className="mt-2 text-sm text-muted">{room.upcomingBookings} upcoming booking{room.upcomingBookings === 1 ? "" : "s"}. Hiding the room keeps them; they still need their room.</p>
        )}
      </div>
      <Card className="p-5 sm:p-6">
        <CatalogForm fields={ROOM_FIELDS} initial={roomToForm(room ?? undefined)} save={save} backHref="/admin/rooms" submitLabel={room ? "Save room" : "Add room"} />
      </Card>
    </div>
  );
}
