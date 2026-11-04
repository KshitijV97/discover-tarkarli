import type { ChannelName, NotificationChannel } from "../types";
import { whatsappChannel } from "./whatsapp";
import { smsChannel } from "./sms";
import { telegramChannel } from "./telegram";

/** Channel registry — add new channels (email, push, Slack…) here. */
export const channels: Record<ChannelName, NotificationChannel> = {
  whatsapp: whatsappChannel,
  sms: smsChannel,
  telegram: telegramChannel,
};
