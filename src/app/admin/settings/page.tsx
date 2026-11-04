import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings-repo";
import { groupToFormValues, SETTINGS_GROUPS } from "@/lib/admin/settings-form";
import { Card } from "@/components/ui/Card";
import { SettingsGroupForm } from "./SettingsGroupForm";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin("/admin/settings");
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Business rules live here, not in code. Each section saves on its own. Secrets (API keys, passwords) stay in environment variables.
          Notifications, room types and the theme are coming next (see docs/roadmap.md).
        </p>
      </div>
      {SETTINGS_GROUPS.map((group) => (
        <Card key={group.key} className="p-6 md:p-8">
          <h2 className="text-xl font-semibold">{group.title}</h2>
          <p className="mt-1 text-sm text-muted">{group.description}</p>
          <div className="mt-6">
            <SettingsGroupForm group={group} initial={groupToFormValues(settings, group.key)} />
          </div>
        </Card>
      ))}
    </div>
  );
}
