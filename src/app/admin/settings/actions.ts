"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/session";
import { saveSettingsGroup } from "@/lib/server/admin-repo";
import { parseGroupForm, SETTINGS_GROUPS, type FormValues } from "@/lib/admin/settings-form";
import type { AppSettings } from "@/lib/settings";

export type SaveSettingsResult =
  | { ok: true }
  | { ok: false; message: string; errors: Record<string, string> };

/**
 * Admin-only. Validates the whole group on the server (never trusts the form),
 * stores it, and refreshes every page that reads settings.
 */
export async function saveSettingsGroupAction(groupKey: string, formData: FormData): Promise<SaveSettingsResult> {
  const admin = await requireAdmin("/admin/settings");
  const group = SETTINGS_GROUPS.find((g) => g.key === groupKey);
  if (!group) return { ok: false, message: "Unknown settings group.", errors: {} };

  const raw: FormValues = {};
  for (const [k, v] of formData.entries()) raw[k] = typeof v === "string" ? v : "";

  const result = parseGroupForm(group, raw);
  if (!result.ok) return { ok: false, message: "Fix the highlighted fields.", errors: result.errors };

  await saveSettingsGroup(group.key, result.value as AppSettings[typeof group.key]);
  console.info(`[admin] ${admin.email} saved settings.${group.key}`);
  revalidatePath("/", "layout");
  return { ok: true };
}
