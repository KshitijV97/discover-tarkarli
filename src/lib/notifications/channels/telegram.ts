import type { NotificationChannel } from "../types";
import { postJson } from "./http";

/**
 * Telegram Bot API — ideal free channel for staff (operator/kitchen groups).
 * Env: TELEGRAM_BOT_TOKEN. Recipients are chat ids (add the bot to a group,
 * then read the id from https://api.telegram.org/bot<token>/getUpdates).
 */
export const telegramChannel: NotificationChannel = {
  name: "telegram",
  isConfigured: () => !!process.env.TELEGRAM_BOT_TOKEN,
  async send(msg) {
    const res = await postJson(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      body: { chat_id: msg.to, text: msg.text, disable_web_page_preview: true },
    });
    const id = (res.result as { message_id?: number } | undefined)?.message_id;
    return { providerMessageId: id ? String(id) : undefined };
  },
};
