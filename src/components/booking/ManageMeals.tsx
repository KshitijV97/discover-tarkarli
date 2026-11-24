"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppSettings } from "@/lib/settings";
import type { BookingDetail } from "@/lib/server/bookings";
import { planMeals, type MealLine } from "@/lib/booking/meals";
import { computeQuote, type Quote } from "@/lib/booking/pricing";
import { formatINR } from "@/lib/money";
import { MealPlanner, linesToValues, valuesToSelections, type MealValues } from "./MealPlanner";
import { PriceSummary } from "./PriceSummary";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type SaveMealsResult = { ok: true; meals: MealLine[]; quote: Quote } | { ok: false; error: string };
type Props = {
  booking: BookingDetail; settings: AppSettings; editable: boolean; serverNow: string;
  /** Staff mode (admin): save through a server action instead of the guest API, and ignore the meal cutoff. */
  saveMeals?: (selections: ReturnType<typeof valuesToSelections>) => Promise<SaveMealsResult>;
  bypassCutoff?: boolean;
};

export function ManageMeals({ booking, settings, editable, serverNow, saveMeals, bypassCutoff }: Props) {
  const [saved, setSaved] = useState<{ meals: MealLine[]; quote: Quote }>({ meals: booking.meals, quote: booking.quote });
  const [values, setValues] = useState<MealValues>(() => linesToValues(booking.meals));
  const [now, setNow] = useState(() => new Date(serverNow));
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const baseline = useMemo(() => linesToValues(saved.meals), [saved.meals]);
  const dirty = Object.keys({ ...baseline, ...values }).some((k) => (baseline[k] ?? 0) !== (values[k] ?? 0));

  const preview = useMemo(() => {
    const { lines } = planMeals({
      checkIn: booking.checkIn, checkOut: booking.checkOut, numGuests: booking.numGuests,
      selections: valuesToSelections(values), settings, now, existing: saved.meals, enforceCutoff: false,
    });
    const q = computeQuote({ checkIn: booking.checkIn, checkOut: booking.checkOut, rooms: booking.rooms, meals: lines, settings });
    // Deposit only moves while unpaid.
    if (booking.depositPaid) { q.deposit = saved.quote.deposit; q.balance = q.total - q.deposit; }
    return q;
  }, [values, saved, booking, settings, now]);

  async function save() {
    setStatus({ kind: "saving" });
    if (saveMeals) {
      const res = await saveMeals(valuesToSelections(values));
      if (!res.ok) { setStatus({ kind: "error", message: res.error }); return; }
      setSaved({ meals: res.meals, quote: res.quote });
      setValues(linesToValues(res.meals));
      setStatus({ kind: "saved", message: "Meals updated." });
      return;
    }
    try {
      const res = await fetch(`/api/manage/${booking.accessToken}/meals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meals: valuesToSelections(values) }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus({ kind: "error", message: data.error }); return; }
      setSaved({ meals: data.meals, quote: data.quote });
      setValues(linesToValues(data.meals));
      setStatus({ kind: "saved", message: "Meals updated." });
    } catch {
      setStatus({ kind: "error", message: "Network error — please try again." });
    }
  }

  if (!editable) {
    return <Card className="p-4"><PriceSummary quote={saved.quote} checkIn={booking.checkIn} checkOut={booking.checkOut} intraState={settings.tax.intraState} /></Card>;
  }

  const delta = preview.total - saved.quote.total;
  return (
    <div className="space-y-4">
      <MealPlanner
        checkIn={booking.checkIn}
        checkOut={booking.checkOut}
        numGuests={booking.numGuests}
        settings={settings}
        values={values}
        onChange={(v) => { setValues(v); setStatus({ kind: "idle" }); }}
        existing={saved.meals}
        now={bypassCutoff ? new Date(0) : now}
      />
      <Card className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 p-4 shadow-raised">
        <div className="text-sm">
          <div className="font-semibold">New total {formatINR(preview.total)}</div>
          <div className={status.kind === "error" ? "text-danger" : status.kind === "saved" ? "text-success" : "text-muted"}>
            {status.message ?? (dirty ? `${delta >= 0 ? "+" : "−"}${formatINR(Math.abs(delta))} vs. current` : "No unsaved changes")}
          </div>
        </div>
        <div className="flex gap-2">
          {dirty && <Button variant="ghost" onClick={() => { setValues(baseline); setStatus({ kind: "idle" }); }}>Reset</Button>}
          <Button onClick={save} disabled={!dirty || status.kind === "saving"}>{status.kind === "saving" ? "Saving…" : "Save meals"}</Button>
        </div>
      </Card>
    </div>
  );
}
