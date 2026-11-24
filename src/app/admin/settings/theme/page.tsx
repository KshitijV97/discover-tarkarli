import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/session";
import { getThemeOverride } from "@/lib/server/settings-repo";
import { themeToForm } from "@/lib/admin/theme-form";
import { ThemeEditor } from "./ThemeEditor";

export const metadata: Metadata = { title: "Theme", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ThemeSettingsPage() {
  await requireAdmin("/admin/settings/theme");
  const override = await getThemeOverride();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/settings" className="text-sm font-semibold text-primary">← Settings</Link>
        <h1 className="mt-3 text-3xl font-semibold">Theme</h1>
        <p className="mt-2 max-w-2xl text-muted">Colours and corners for the whole site. The preview changes as you edit; the site changes when you save.</p>
      </div>
      <ThemeEditor initial={themeToForm(override)} defaults={themeToForm(null)} />
    </div>
  );
}
