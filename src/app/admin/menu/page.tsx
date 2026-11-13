import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/session";
import { listAllMenuItems } from "@/lib/server/catalog-repo";
import { formatINR } from "@/lib/money";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Menu", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await requireAdmin("/admin/menu");
  const items = await listAllMenuItems();
  const categories = [...new Set(items.map((i) => i.category))];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Menu</h1>
          <p className="mt-2 text-muted">Dishes and prices for in-stay ordering and the kitchen. Lunch and dinner plan prices are in Settings.</p>
        </div>
        <Link href="/admin/menu/new" className="inline-flex min-h-11 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground">Add a dish</Link>
      </div>
      {items.length === 0 && <Card className="p-8 text-center text-muted">No dishes yet. Add the first one.</Card>}
      {categories.map((c) => (
        <Card key={c} className="p-5 sm:p-6">
          <h2 className="font-heading text-xl font-semibold">{c}</h2>
          <ul className="mt-3 divide-y divide-border">
            {items.filter((i) => i.category === c).map((i) => (
              <li key={i.id}>
                <Link href={`/admin/menu/${i.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-primary">
                  <span className="font-medium">{i.name}<span className="ml-2 text-xs text-muted">{i.veg ? "veg" : "non-veg"}{i.active ? "" : " · off the menu"}</span></span>
                  <span className="text-sm font-semibold">{formatINR(Math.round(i.price * 100))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
