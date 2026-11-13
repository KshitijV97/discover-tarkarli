import Link from "next/link";
import { requireStaff } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview", adminOnly: false },
  { href: "/admin/bookings", label: "Bookings", adminOnly: false },
  { href: "/admin/notifications", label: "Messages", adminOnly: false },
  { href: "/admin/rooms", label: "Rooms", adminOnly: true },
  { href: "/admin/menu", label: "Menu", adminOnly: true },
  { href: "/admin/settings", label: "Settings", adminOnly: true },
];

/** Every admin page is staff-only; settings is additionally admin-only. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const links = NAV.filter((n) => !n.adminOnly || user.role === "admin");
  return (
    <div className="container-page pb-10 pt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{user.role}</p>
      <nav aria-label="Admin" className="mt-3 flex gap-1 overflow-x-auto border-b border-border">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="-mb-px min-h-11 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-muted hover:border-border hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
