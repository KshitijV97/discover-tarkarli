import "server-only";
import { db } from "./db";
import { parseSettings, type AppSettings } from "@/lib/settings";
import type { ThemeOverride } from "@/theme/theme.config";

export async function getSettings(): Promise<AppSettings> {
  const rows = await db()<{ key: string; value: unknown }[]>`select key, value from settings`;
  return parseSettings(rows.map((r) => ({ key: r.key, value: unwrapJson(r.value) })));
}

/** Optional theme override stored in settings (key "theme"). Never throws. */
export async function getThemeOverride(): Promise<ThemeOverride | null> {
  try {
    const [row] = await db()<{ value: ThemeOverride }[]>`select value from settings where key = 'theme'`;
    const v = unwrapJson(row?.value);
    return v && typeof v === "object" ? (v as ThemeOverride) : null;
  } catch {
    return null; // DB unreachable → fall back to the file theme
  }
}

/**
 * Before 2026-11-24 the admin saved settings as a JSON *string* inside jsonb
 * (double-encoded). Read those rows as the object they were meant to be.
 */
function unwrapJson(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return v; }
}
