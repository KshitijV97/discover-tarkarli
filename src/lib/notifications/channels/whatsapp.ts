import type { NotificationChannel } from "../types";
import { postJson } from "./http";

/**
 * WhatsApp Cloud API (Meta). Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 * optional WHATSAPP_API_VERSION (default v21.0).
 * Uses an approved template when settings.notifications.whatsappTemplates has a
 * mapping for "event.audience", otherwise sends free text (24h window only).
 */
export const whatsappChannel: NotificationChannel = {
  name: "whatsapp",
  isConfigured: () => !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID,
  async send(msg, { settings }) {
    const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
    const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const to = msg.to.replace(/^\+/, "");
    const tpl = settings.notifications.whatsappTemplates[`${msg.event}.${msg.audience}`];
    const body = tpl
      ? {
          messaging_product: "whatsapp", to, type: "template",
          template: {
            name: tpl.name,
            language: { code: tpl.language },
            components: tpl.params.length
              ? [{ type: "body", parameters: tpl.params.map((p) => ({ type: "text", text: msg.vars[p] ?? "-" })) }]
              : [],
          },
        }
      : { messaging_product: "whatsapp", to, type: "text", text: { preview_url: true, body: msg.text } };
    const res = await postJson(url, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }, body });
    const id = (res.messages as { id: string }[] | undefined)?.[0]?.id;
    return { providerMessageId: id };
  },
};
