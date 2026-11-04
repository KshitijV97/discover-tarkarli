import type { AppSettings } from "@/lib/settings";
import { channels } from "./channels";
import { renderTemplate, resolveTemplate } from "./templates";
import { AUDIENCES, type Audience, type ChannelName, type NotificationEvent, type OutboundMessage, type TemplateVars } from "./types";

export interface PlannedDelivery extends OutboundMessage {
  /** Why it won't be sent (channel disabled / not configured / no template). */
  skipReason?: string;
}

/**
 * Pure: works out every (audience, channel, recipient) message for an event,
 * from settings.notifications routes + recipients. Guests are reached on
 * their booking phone (WhatsApp/SMS); staff via configured recipient lists.
 */
export function planDeliveries(params: {
  event: NotificationEvent;
  vars: TemplateVars;
  settings: AppSettings;
  guestPhone?: string;
  /** Override channel configuration check (tests). */
  isConfigured?: (c: ChannelName) => boolean;
}): PlannedDelivery[] {
  const { event, vars, settings, guestPhone } = params;
  const n = settings.notifications;
  if (!n.enabled) return [];
  const configured = params.isConfigured ?? ((c: ChannelName) => channels[c].isConfigured());
  const routes = n.routes[event] ?? {};
  const out: PlannedDelivery[] = [];

  for (const audience of AUDIENCES as readonly Audience[]) {
    const chans = routes[audience] ?? [];
    if (chans.length === 0) continue;
    const template = resolveTemplate(event, audience, n.templates);
    const text = template ? renderTemplate(template, vars) : "";

    for (const channel of chans) {
      const recipients =
        audience === "guest"
          ? channel === "telegram" || !guestPhone ? [] : [guestPhone]
          : n.recipients[audience][channel];
      for (const to of recipients) {
        let skipReason: string | undefined;
        if (!n.channels[channel]) skipReason = `${channel} disabled in settings`;
        else if (!configured(channel)) skipReason = `${channel} not configured (missing env credentials)`;
        else if (!template) skipReason = `no template for ${event}.${audience}`;
        out.push({ channel, event, audience, to, text, vars, skipReason });
      }
    }
  }
  return out;
}
