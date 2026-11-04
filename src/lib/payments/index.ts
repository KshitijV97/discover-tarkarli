import type { PaymentProvider } from "./types";
import { razorpay } from "./razorpay";

/** Provider registry. PAYMENT_PROVIDER env picks one (default razorpay). */
const providers: Record<string, PaymentProvider> = { razorpay };

export function getPaymentProvider(name = process.env.PAYMENT_PROVIDER ?? "razorpay"): PaymentProvider | null {
  const p = providers[name];
  return p && p.isConfigured() ? p : null;
}

export function getProviderByName(name: string): PaymentProvider | null {
  return providers[name] ?? null;
}
