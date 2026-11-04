import { NextResponse, type NextRequest } from "next/server";
import { razorpay } from "@/lib/payments/razorpay";
import { recordPayment, recordPaymentFailure } from "@/lib/server/payments";

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks):
 *   URL: <site>/api/webhooks/razorpay · Secret: RAZORPAY_WEBHOOK_SECRET
 *   Events: payment.captured, payment.failed, order.paid
 * The source of truth if the guest closes the browser before the callback.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const event = razorpay.parseWebhook(raw, req.headers.get("x-razorpay-signature"));
  if (!event) return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  try {
    if (event.type === "paid" && event.orderId && event.paymentId) {
      const res = await recordPayment({ provider: "razorpay", orderId: event.orderId, paymentId: event.paymentId, method: event.method, raw: event.raw });
      return NextResponse.json({ ok: true, outcome: res.outcome });
    }
    if (event.type === "failed" && event.orderId) {
      await recordPaymentFailure("razorpay", event.orderId, event.failureReason ?? "failed", event.raw);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[razorpay webhook]", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 }); // Razorpay will retry
  }
}
