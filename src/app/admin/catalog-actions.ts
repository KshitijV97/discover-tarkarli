"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/session";
import { CatalogError, saveMenuItem, saveRoom } from "@/lib/server/catalog-repo";
import { parseMenuForm, parseRoomForm, type FormValues } from "@/lib/admin/catalog-forms";
import type { SaveResult } from "@/components/admin/CatalogForm";

const values = (data: FormData): FormValues => {
  const v: FormValues = {};
  for (const [k, x] of data.entries()) v[k] = typeof x === "string" ? x : "";
  return v;
};

async function persist(fn: () => Promise<string>): Promise<SaveResult> {
  try {
    const id = await fn();
    revalidatePath("/", "layout"); // rooms and menu appear across the public site
    return { ok: true, id };
  } catch (err) {
    if (err instanceof CatalogError) return { ok: false, message: err.message, errors: { [err.field]: err.message } };
    console.error("[admin] catalog save failed", err);
    return { ok: false, message: "Couldn't save. Nothing was changed; please try again.", errors: {} };
  }
}

/** Admin-only: prices are business values. `id` null creates a new room. */
export async function saveRoomAction(id: string | null, data: FormData): Promise<SaveResult> {
  const admin = await requireAdmin("/admin/rooms");
  const parsed = parseRoomForm(values(data));
  if (!parsed.ok) return { ok: false, message: "Fix the highlighted fields.", errors: parsed.errors };
  return persist(() => saveRoom(id, parsed.value, admin.email ?? admin.id));
}

export async function saveMenuItemAction(id: string | null, data: FormData): Promise<SaveResult> {
  const admin = await requireAdmin("/admin/menu");
  const parsed = parseMenuForm(values(data));
  if (!parsed.ok) return { ok: false, message: "Fix the highlighted fields.", errors: parsed.errors };
  return persist(() => saveMenuItem(id, parsed.value, admin.email ?? admin.id));
}
