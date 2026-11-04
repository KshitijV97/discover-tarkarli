import crypto from "node:crypto";
import type { PaymentProvider, WebhookPaymentEvent } from "./types";

/**
 * Razorpay via its REST API (no SDK dependency).
 * Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
 * Docs: https://razorpay.com/docs/payments/server-integration/
 */
const API = "https://api.razorpay.com/v1";

export function hmacHex(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const razorpay: PaymentProvider = {
  name: "razorpay",
  isConfigured: () => !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET,
  publicKey: () => process.env.RAZORPAY_KEY_ID ?? "",

  async createOrder({ amount, currency, receipt, notes }) {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency, receipt: receipt.slice(0, 40), notes, payment_capture: 1 }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Razorpay order failed: ${data?.error?.description ?? res.status}`);
    return { orderId: data.id, amount: data.amount, currency: data.currency };
  },

  verifyCheckout({ orderId, paymentId, signature }) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || !signature) return false;
    return safeEqual(hmacHex(secret, `${orderId}|${paymentId}`), signature);
  },

  parseWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature || !safeEqual(hmacHex(secret, rawBody), signature)) return null;
    const body = JSON.parse(rawBody);
    const p = body?.payload?.payment?.entity;
    const base = { orderId: p?.order_id, paymentId: p?.id, amount: p?.amount, method: p?.method, raw: body } as const;
    switch (body?.event) {
      case "payment.captured":
      case "order.paid":
        return { type: "paid", ...base } satisfies WebhookPaymentEvent;
      case "payment.failed":
        return { type: "failed", ...base, failureReason: p?.error_description ?? p?.error_reason } satisfies WebhookPaymentEvent;
      default:
        return { type: "ignored", raw: body };
    }
  },
};
