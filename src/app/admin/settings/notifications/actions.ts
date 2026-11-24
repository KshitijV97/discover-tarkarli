"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings-repo";
import { saveNotificationSettings } from "@/lib/server/admin-repo";
import { writeAudit } from "@/lib/server/audit-repo";
import { describeNotificationChanges, parseNotificationsForm, type FormValues } from "@/lib/admin/notifications-form";

export type SaveResult = { ok: true } | { ok: false; message: string; errors: Record<string, string> };

/** Admin-only. Re-validates everything on the server; provider template mappings are kept as they are. */
export async function saveNotificationsAction(formData: FormData): Promise<SaveResult> {
  const admin = await requireAdmin("/admin/settings/notifications");
  const raw: FormValues = {};
  for (const [k, v] of formData.entries()) raw[k] = typeof v === "string" ? v : "";
  const current = (await getSettings()).notifications;
  const parsed = parseNotificationsForm(raw, current);
  if (!parsed.ok) return { ok: false, message: "Fix the highlighted fields.", errors: parsed.errors };
  await saveNotificationSettings(parsed.value);
  await writeAudit({
    actorEmail: admin.email ?? admin.id, action: "settings.save", entity: "settings", entityId: "notifications",
    detail: { summary: describeNotificationChanges(current, parsed.value) },
  });
  revalidatePath("/admin/settings", "layout");
  return { ok: true };
}
