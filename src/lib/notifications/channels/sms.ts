import type { NotificationChannel } from "../types";
import { postJson } from "./http";

/**
 * SMS with pluggable providers. Env: SMS_PROVIDER = "msg91" | "twilio".
 *
 * msg91 (India, DLT-compliant): MSG91_AUTH_KEY. Each "event.audience" needs a
 *   DLT-approved template mapped in settings.notifications.smsTemplates.
 * twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM. Sends free text
 *   (Indian recipients still need DLT registration via Twilio).
 *
 * To add a provider: implement another branch here (or split into files).
 */
const provider = () => process.env.SMS_PROVIDER?.toLowerCase();

export const smsChannel: NotificationChannel = {
  name: "sms",
  isConfigured() {
    const p = provider();
    if (p === "msg91") return !!process.env.MSG91_AUTH_KEY;
    if (p === "twilio") return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
    return false;
  },
  async send(msg, { settings }) {
    if (provider() === "msg91") {
      const tpl = settings.notifications.smsTemplates[`${msg.event}.${msg.audience}`];
      if (!tpl) throw new Error(`No DLT template mapped for ${msg.event}.${msg.audience} (settings.notifications.smsTemplates)`);
      const recipient: Record<string, string> = { mobiles: msg.to.replace(/^\+/, "") };
      tpl.params.forEach((p, i) => (recipient[`var${i + 1}`] = msg.vars[p] ?? ""));
      const res = await postJson("https://control.msg91.com/api/v5/flow", {
        headers: { authkey: process.env.MSG91_AUTH_KEY! },
        body: { template_id: tpl.templateId, short_url: "0", recipients: [recipient] },
      });
      return { providerMessageId: typeof res.message === "string" ? res.message : undefined };
    }
    // twilio
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const res = await postJson(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      form: true,
      headers: { Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64") },
      body: { To: msg.to, From: process.env.TWILIO_FROM!, Body: msg.text },
    });
    return { providerMessageId: res.sid as string | undefined };
  },
};
