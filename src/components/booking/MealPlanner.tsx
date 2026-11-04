"use client";

import { useMemo } from "react";
import { formatDate, type ISODate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { AppSettings } from "@/lib/settings";
import { currentMealPrice, isMealLocked, mealCutoff, mealLabel, mealSlots, slotKey, type MealLine, type MealSlot } from "@/lib/booking/meals";
import { Stepper } from "@/components/ui/Stepper";

export type MealValues = Record<string, number>; // slotKey → headcount

interface Props {
  checkIn: ISODate;
  checkOut: ISODate;
  numGuests: number;
  settings: AppSettings;
  values: MealValues;
  onChange: (values: MealValues) => void;
  /** Existing rows (edit mode) — their price snapshot is shown instead of today's price. */
  existing?: MealLine[];
  now: Date;
}

const cutoffFmt = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);

export function MealPlanner({ checkIn, checkOut, numGuests, settings, values, onChange, existing, now }: Props) {
  const existingMap = useMemo(() => new Map((existing ?? []).map((l) => [slotKey(l.date, l.mealType), l])), [existing]);
  const slots = useMemo(() => {
    const all = mealSlots(checkIn, checkOut, settings.meals.breakfastIncluded).map((s) => {
      // Respect an existing row's inclusion status (setting may have changed after booking).
      const prev = existingMap.get(slotKey(s.date, s.mealType));
      return s.mealType === "breakfast" && prev ? { ...s, included: prev.includedFree } : s;
    });
    const byDate = new Map<ISODate, MealSlot[]>();
    for (const s of all) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
    return [...byDate.entries()];
  }, [checkIn, checkOut, settings.meals.breakfastIncluded, existingMap]);

  const priceOf = (s: MealSlot) => existingMap.get(slotKey(s.date, s.mealType))?.unitPrice ?? currentMealPrice(s.mealType, settings);
  const locked = (s: MealSlot) => isMealLocked(s.date, settings, now);

  function setAll(mealType: "lunch" | "dinner", qty: number) {
    const next = { ...values };
    for (const [, daySlots] of slots) for (const s of daySlots) if (s.mealType === mealType && !locked(s)) next[slotKey(s.date, s.mealType)] = qty;
    onChange(next);
  }

  const tz = settings.property.timezone;
  const [h, m] = settings.meals.cutoffTime.split(":").map(Number);
  const cutoffText = `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
  const daysText = settings.meals.cutoffDaysBefore === 0 ? "on the day" : settings.meals.cutoffDaysBefore === 1 ? "the day before" : `${settings.meals.cutoffDaysBefore} days before`;

  return (
    <div className="space-y-4">
      <div className="rounded-card bg-primary-soft p-4 text-sm text-foreground">
        {settings.meals.breakfastIncluded && <p><strong>Breakfast is included</strong> every morning of your stay.</p>}
        <p className="mt-1">
          Add lunch ({formatINR(currentMealPrice("lunch", settings))}) or dinner ({formatINR(currentMealPrice("dinner", settings))}) per person, + GST.
          You can change meals until {cutoffText} {daysText}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-pill border border-primary/30 bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-muted" onClick={() => setAll("dinner", numGuests)}>Dinner for everyone, every night</button>
          <button type="button" className="rounded-pill border border-primary/30 bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-muted" onClick={() => setAll("lunch", numGuests)}>Lunch for everyone, every day</button>
          <button type="button" className="rounded-pill px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground" onClick={() => { setAll("lunch", 0); setAll("dinner", 0); }}>Clear</button>
        </div>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {slots.map(([date, daySlots]) => (
          <li key={date} className="p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h4 className="font-heading font-semibold">{formatDate(date)}</h4>
              {date === checkIn && <span className="text-xs text-muted">Check-in day</span>}
              {date === checkOut && <span className="text-xs text-muted">Check-out day</span>}
            </div>
            <div className="space-y-2">
              {daySlots.map((s) => {
                const key = slotKey(s.date, s.mealType);
                const isLocked = locked(s);
                if (s.included) {
                  return (
                    <div key={key} className="flex min-h-11 items-center justify-between text-sm">
                      <span>{mealLabel(s.mealType)}</span>
                      <span className="rounded-pill bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Included · {numGuests} guest{numGuests > 1 ? "s" : ""}</span>
                    </div>
                  );
                }
                const qty = values[key] ?? 0;
                return (
                  <div key={key} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                    <div>
                      <div>{mealLabel(s.mealType)} <span className="text-muted">· {formatINR(priceOf(s))}/person</span></div>
                      {isLocked && <div className="text-xs text-warning">Locked since {cutoffFmt(mealCutoff(s.date, settings), tz)}</div>}
                    </div>
                    <Stepper
                      label={`${mealLabel(s.mealType)} on ${formatDate(s.date)}`}
                      value={qty}
                      max={numGuests}
                      disabled={isLocked}
                      onChange={(v) => onChange({ ...values, [key]: v })}
                    />
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Convert planner values to the API's selection list. */
export function valuesToSelections(values: MealValues) {
  return Object.entries(values).map(([key, quantity]) => {
    const [date, mealType] = key.split("|") as [ISODate, "breakfast" | "lunch" | "dinner"];
    return { date, mealType, quantity };
  });
}

/** Convert stored meal rows to planner values. */
export function linesToValues(lines: MealLine[]): MealValues {
  return Object.fromEntries(lines.filter((l) => !l.includedFree).map((l) => [slotKey(l.date, l.mealType), l.quantity]));
}
