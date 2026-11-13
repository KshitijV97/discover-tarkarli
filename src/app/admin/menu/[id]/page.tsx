import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/server/session";
import { getMenuItemForEdit } from "@/lib/server/catalog-repo";
import { MENU_FIELDS, menuToForm } from "@/lib/admin/catalog-forms";
import { Card } from "@/components/ui/Card";
import { CatalogForm } from "@/components/admin/CatalogForm";
import { saveMenuItemAction } from "../../catalog-actions";

export const metadata: Metadata = { title: "Edit dish", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminMenuEditPage({ params }: { params: { id: string } }) {
  await requireAdmin(`/admin/menu/${params.id}`);
  const isNew = params.id === "new";
  const item = isNew ? null : await getMenuItemForEdit(params.id);
  if (!isNew && !item) notFound();
  const save = saveMenuItemAction.bind(null, item?.id ?? null);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold">{item ? item.name : "Add a dish"}</h1>
      <Card className="p-5 sm:p-6">
        <CatalogForm fields={MENU_FIELDS} initial={menuToForm(item ?? undefined)} save={save} backHref="/admin/menu" submitLabel={item ? "Save dish" : "Add dish"} />
      </Card>
    </div>
  );
}
