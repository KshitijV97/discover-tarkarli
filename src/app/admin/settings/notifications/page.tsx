import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings-repo";
import { notificationsToForm } from "@/lib/admin/notifications-form";
import { DEFAULT_TEMPLATES } from "@/lib/notifications/templates";
import { channels } from "@/lib/notifications/channels";
import { NotificationsForm } from "./NotificationsForm";

export const metadata: Metadata = { title: "Notification settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  await requireAdmin("/admin/settings/notifications");
  const settings = await getSettings();
  const connected = { whatsapp: channels.whatsapp.isConfigured(), sms: channels.sms.isConfigured(), telegram: channels.telegram.isConfigured() };
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/settings" className="text-sm font-semibold text-primary">← Settings</Link>
        <h1 className="mt-3 text-3xl font-semibold">Notifications</h1>
        <p className="mt-2 max-w-2xl text-muted">Which WhatsApp, SMS and Telegram messages go to guests, staff and the kitchen, and what they say. API keys stay in environment variables; this page never shows them.</p>
      </div>
      <NotificationsForm initial={notificationsToForm(settings.notifications)} defaults={DEFAULT_TEMPLATES as Record<string, string>} connected={connected} />
    </div>
  );
}
