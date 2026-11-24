"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/session";
import { getThemeOverride } from "@/lib/server/settings-repo";
import { saveThemeOverride } from "@/lib/server/admin-repo";
import { writeAudit } from "@/lib/server/audit-repo";
import { parseThemeForm, type FormValues } from "@/lib/admin/theme-form";

export type SaveResult = { ok: true; message: string } | { ok: false; message: string; errors: Record<string, string> };

/** Admin-only. Re-validates every value (they are written into the page's CSS). */
export async function saveThemeAction(formData: FormData): Promise<SaveResult> {
  const admin = await requireAdmin("/admin/settings/theme");
  const raw: FormValues = {};
  for (const [k, v] of formData.entries()) raw[k] = typeof v === "string" ? v : "";
  const reset = raw.reset === "1";
  const parsed = reset ? null : parseThemeForm(raw);
  if (parsed && !parsed.ok) return { ok: false, message: parsed.errors.contrast ?? "Fix the highlighted fields.", errors: parsed.errors };

  const before = await getThemeOverride();
  const value = parsed?.ok ? parsed.value : null;
  await saveThemeOverride(value);
  await writeAudit({
    actorEmail: admin.email ?? admin.id, action: "settings.save", entity: "settings", entityId: "theme",
    detail: { summary: value ? `theme: ${Object.keys(value.colors ?? {}).length} colour(s)${value.radius ? ", corners" : ""} changed` : "theme: reset to default", before, after: value },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: value ? "Saved. The whole site uses the new look now." : "Reset. The site is back to the default look." };
}
