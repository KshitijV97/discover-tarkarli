import "server-only";
import { db } from "./db";
import { parseSettings, type AppSettings } from "@/lib/settings";
import type { ThemeOverride } from "@/theme/theme.config";

export async function getSettings(): Promise<AppSettings> {
  const rows = await db()<{ key: string; value: unknown }[]>`select key, value from settings`;
  return parseSettings(rows);
}

/** Optional theme override stored in settings (key "theme"). Never throws. */
export async function getThemeOverride(): Promise<ThemeOverride | null> {
  try {
    const [row] = await db()<{ value: ThemeOverride }[]>`select value from settings where key = 'theme'`;
    return row?.value ?? null;
  } catch {
    return null; // DB unreachable → fall back to the file theme
  }
}
