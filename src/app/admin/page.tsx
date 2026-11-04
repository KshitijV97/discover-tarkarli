import type { Metadata } from "next";
import { requireStaff } from "@/lib/server/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Staff-only. The full dashboard is next on the roadmap (docs/roadmap.md). */
export default async function AdminPage() {
  const user = await requireStaff();
  return (
    <div className="container-page pb-10 pt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{user.role}</p>
      <h1 className="mt-2 text-3xl font-semibold">Admin dashboard</h1>
      <p className="mt-2 max-w-lg text-muted">Signed in as {user.email}. Bookings, meals, payments, rooms, menu and settings management are coming next.</p>
    </div>
  );
}
