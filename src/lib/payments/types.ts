import type { Paise } from "@/lib/money";

/**
 * Payment provider contract. Razorpay is the first implementation; adding
 * Stripe/PayU/Cashfree means implementing this interface and registering it
 * in ./index.ts — booking/payment logic doesn't change.
 */
export interface CreateOrderInput {
  amount: Paise;
  currency: string;
  receipt: string;               // our reference, e.g. booking reference
  notes?: Record<string, string>;
}

export interface ProviderOrder {
  orderId: string;
  amount: Paise;
  currency: string;
}

/** What the browser needs to open the provider's checkout. */
export interface CheckoutSession {
  provider: string;
  keyId: string;
  orderId: string;
  amount: Paise;
  currency: string;
}

export interface CheckoutResult {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookPaymentEvent {
  type: "paid" | "failed" | "ignored";
  orderId?: string;
  paymentId?: string;
  amount?: Paise;
  method?: string;
  failureReason?: string;
  raw: unknown;
}

export interface PaymentProvider {
  name: string;
  isConfigured(): boolean;
  publicKey(): string;
  createOrder(input: CreateOrderInput): Promise<ProviderOrder>;
  /** Verifies the signature returned to the browser after checkout. */
  verifyCheckout(result: CheckoutResult): boolean;
  /** Verifies + parses a webhook. Returns null when the signature is invalid. */
  parseWebhook(rawBody: string, signature: string | null): WebhookPaymentEvent | null;
}
