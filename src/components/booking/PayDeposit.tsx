"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: (r: unknown) => void): void };
  }
}

/** Theme primary ("14 110 140" channels) → "rgb(14,110,140)" for Razorpay. */
function themePrimary(): string | undefined {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim().split(/\s+/);
  return v.length === 3 ? `rgb(${v.join(",")})` : undefined;
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const s = existing ?? document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load the payment window. Check your connection."));
    if (!existing) document.body.appendChild(s);
  });
}

interface Props {
  token: string;
  amount: number;
  pending: boolean;
  expiresAt: string | null;
  autoOpen?: boolean;
}

export function PayDeposit({ token, amount, pending, expiresAt, autoOpen }: Props) {
  const router = useRouter();
  const [state, setState] = useState<{ kind: "idle" | "loading" | "verifying" | "error" | "done"; message?: string }>({ kind: "idle" });
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (!pending || !expiresAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [pending, expiresAt]);

  const pay = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/manage/${token}/pay`, { method: "POST" });
      const session = await res.json();
      if (!res.ok) throw new Error(session.error ?? "Couldn't start payment");
      await loadCheckout();

      const rzp = new window.Razorpay!({
        key: session.keyId,
        order_id: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: session.propertyName,
        description: `Deposit · ${session.bookingReference}`,
        prefill: session.prefill,
        timeout: session.holdSecondsLeft ?? undefined,
        theme: { color: themePrimary() },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setState({ kind: "verifying" });
          const v = await fetch(`/api/payments/${session.provider}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
          });
          const data = await v.json();
          if (!v.ok) { setState({ kind: "error", message: data.error }); return; }
          setState({ kind: "done", message: data.outcome === "conflict"
            ? "Payment received, but your room was released before it completed. Our team will contact you about a refund or alternative."
            : "Deposit received — your booking is confirmed!" });
          router.replace(`/booking/${token}`);
          router.refresh();
        },
        modal: { ondismiss: () => setState((s) => (s.kind === "loading" ? { kind: "idle" } : s)) },
      });
      rzp.on("payment.failed", (resp) => {
        const e = (resp as { error?: { description?: string } }).error;
        setState({ kind: "error", message: e?.description ?? "Payment failed. You can try again." });
      });
      rzp.open();
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }, [token, router]);

  useEffect(() => {
    if (autoOpen && !opened.current) { opened.current = true; void pay(); }
  }, [autoOpen, pay]);

  const expired = pending && secondsLeft === 0;
  const mmss = secondsLeft !== null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : null;

  return (
    <div className="space-y-2">
      {pending && mmss && !expired && (
        <p className="text-xs text-warning">Room held for you for <span className="font-semibold tabular-nums">{mmss}</span></p>
      )}
      {expired ? (
        <p className="rounded-md bg-danger/10 p-3 text-xs text-danger">Your hold has expired. Refresh to check whether the room is still available, or make a new booking.</p>
      ) : (
        <Button block variant="accent" onClick={pay} disabled={state.kind === "loading" || state.kind === "verifying" || state.kind === "done"}>
          {state.kind === "loading" ? "Opening…" : state.kind === "verifying" ? "Confirming…" : `Pay deposit ${formatINR(amount)}`}
        </Button>
      )}
      {state.message && (
        <p className={`text-xs ${state.kind === "error" ? "text-danger" : "text-success"}`}>{state.message}</p>
      )}
      <p className="text-[11px] text-muted">Secure payment by Razorpay · UPI, cards, netbanking</p>
    </div>
  );
}
