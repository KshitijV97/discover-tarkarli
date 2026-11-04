import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hmacHex, razorpay } from "./razorpay";

describe("razorpay signatures", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "hook_secret";
  });
  afterEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  it("verifies checkout signature = HMAC(order_id|payment_id)", () => {
    const signature = hmacHex("test_secret", "order_1|pay_1");
    expect(razorpay.verifyCheckout({ orderId: "order_1", paymentId: "pay_1", signature })).toBe(true);
    expect(razorpay.verifyCheckout({ orderId: "order_1", paymentId: "pay_2", signature })).toBe(false);
    expect(razorpay.verifyCheckout({ orderId: "order_1", paymentId: "pay_1", signature: "bad" })).toBe(false);
  });

  it("parses signed webhooks and rejects tampered ones", () => {
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 368600, method: "upi" } } } });
    const ev = razorpay.parseWebhook(body, hmacHex("hook_secret", body));
    expect(ev).toMatchObject({ type: "paid", orderId: "order_1", paymentId: "pay_1", amount: 368600, method: "upi" });
    expect(razorpay.parseWebhook(body + " ", hmacHex("hook_secret", body))).toBeNull();
    expect(razorpay.parseWebhook(body, null)).toBeNull();
  });

  it("maps payment.failed and ignores other events", () => {
    const failed = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "p", order_id: "o", error_description: "Card declined" } } } });
    expect(razorpay.parseWebhook(failed, hmacHex("hook_secret", failed))).toMatchObject({ type: "failed", failureReason: "Card declined" });
    const other = JSON.stringify({ event: "refund.created" });
    expect(razorpay.parseWebhook(other, hmacHex("hook_secret", other))?.type).toBe("ignored");
  });
});
