"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ACTION_LABEL, MANUAL_METHODS, METHOD_LABEL, type ActionOption } from "@/lib/admin/booking-ops";
import { formatINR } from "@/lib/money";
import { recordPaymentAction, resendAction, saveNotesAction, staffActionAction, type ActionResult } from "./actions";

function Message({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return <p role="status" className={`text-sm ${result.ok ? "text-success" : "text-danger"}`}>{result.message}</p>;
}

/** Check in / check out / cancel, with a confirm step for cancelling. */
export function StatusActions({ bookingId, options }: { bookingId: string; options: ActionOption[] }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, start] = useTransition();
  const go = (action: string) => start(async () => { setResult(await staffActionAction(bookingId, action)); setConfirmCancel(false); });

  const available = options.filter((o) => o.allowed);
  // Only explain a blocked check-in while the booking is still upcoming (pending or confirmed); otherwise it's noise.
  const upcoming = options.some((o) => o.action === "cancel" && o.allowed);
  const blocked = upcoming ? options.filter((o) => !o.allowed && o.action === "check_in") : [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {available.filter((o) => o.action !== "cancel").map((o) => (
          <Button key={o.action} onClick={() => go(o.action)} disabled={pending}>{ACTION_LABEL[o.action]}</Button>
        ))}
        {available.some((o) => o.action === "cancel") && !confirmCancel && (
          <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={pending}>Cancel booking…</Button>
        )}
      </div>
      {confirmCancel && (
        <div className="rounded-md border border-danger/40 bg-danger/5 p-4">
          <p className="text-sm font-medium">Cancel this booking? The rooms become bookable again and the guest is told. This can&apos;t be undone here.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="accent" onClick={() => go("cancel")} disabled={pending}>{pending ? "Cancelling…" : "Yes, cancel it"}</Button>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)} disabled={pending}>Keep booking</Button>
          </div>
        </div>
      )}
      {available.length === 0 && <p className="text-sm text-muted">No actions available for this booking.</p>}
      {blocked.map((o) => <p key={o.action} className="text-xs text-muted">{ACTION_LABEL[o.action]}: {o.reason}</p>)}
      <Message result={result} />
    </div>
  );
}

const selectClass = "block h-12 w-full rounded-md border border-border bg-surface px-3.5 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

/** Record money taken at the property. Defaults the amount to the balance due. */
export function RecordPayment({ bookingId, balance }: { bookingId: string; balance: number }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    start(async () => {
      const res = await recordPaymentAction(bookingId, data);
      setResult(res);
      if (res.ok) form.reset();
    });
  }
  if (balance <= 0) return <p className="text-sm text-success">Fully paid. Nothing is due.</p>;
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field name="amount" label="Amount (₹)" inputMode="decimal" defaultValue={(balance / 100).toFixed(0)} hint={`Due: ${formatINR(balance)}`} required />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">Paid by</span>
        <select name="method" defaultValue="upi" className={selectClass}>
          {MANUAL_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
        </select>
      </label>
      <div className="sm:col-span-2"><Field name="note" label="Note (optional)" placeholder="UPI reference, who took it…" /></div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Recording…" : "Record payment"}</Button>
        <Message result={result} />
      </div>
    </form>
  );
}

export function NotesForm({ bookingId, notes }: { bookingId: string; notes: string | null }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => setResult(await saveNotesAction(bookingId, data)));
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="sr-only">Staff notes</span>
        <textarea name="notes" defaultValue={notes ?? ""} rows={4} maxLength={4000}
          placeholder="Arrival time, dog's name, special requests… Guests never see this."
          className="block w-full rounded-md border border-border bg-surface p-3.5 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Save notes"}</Button>
        <Message result={result} />
      </div>
    </form>
  );
}

export function ResendButton({ notificationId, bookingId }: { notificationId: string; bookingId: string | null }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="ghost" className="min-h-11 px-3" disabled={pending}
        onClick={() => start(async () => setResult(await resendAction(notificationId, bookingId)))}>
        {pending ? "Sending…" : "Resend"}
      </Button>
      {result && <span className={`text-xs ${result.ok ? "text-success" : "text-danger"}`}>{result.message}</span>}
    </div>
  );
}
