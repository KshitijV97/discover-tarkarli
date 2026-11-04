"use client";

import { useEffect, useMemo, useState } from "react";
import { eachDate, type ISODate } from "@/lib/dates";

interface Props {
  checkIn: ISODate | null;
  checkOut: ISODate | null;
  onChange: (checkIn: ISODate | null, checkOut: ISODate | null) => void;
  minDate: ISODate;
  maxDate: ISODate;
  /** Free rooms per night; 0 = sold out (can't stay that night, can still check out that morning). */
  freeByNight: Record<ISODate, number>;
  /** Called with [from, to) whenever the visible months change, so the parent can load availability. */
  onVisibleRangeChange?: (from: ISODate, to: ISODate) => void;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthStart = (d: ISODate) => d.slice(0, 8) + "01";
const addMonths = (m: ISODate, n: number) => {
  const y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + n;
  const d = new Date(Date.UTC(y, mo, 1));
  return d.toISOString().slice(0, 10);
};
const monthLabel = (m: ISODate) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(m + "T00:00:00Z"));

function monthGrid(m: ISODate): (ISODate | null)[] {
  const first = new Date(m + "T00:00:00Z");
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const days = eachDate(m, addMonths(m, 1));
  return [...Array(lead).fill(null), ...days];
}

export function DateRangeCalendar({ checkIn, checkOut, onChange, minDate, maxDate, freeByNight, onVisibleRangeChange }: Props) {
  const [view, setView] = useState<ISODate>(monthStart(checkIn ?? minDate));
  const [hover, setHover] = useState<ISODate | null>(null);
  const months = useMemo(() => [view, addMonths(view, 1)], [view]);

  useEffect(() => {
    onVisibleRangeChange?.(months[0], addMonths(months[1], 1));
  }, [months, onVisibleRangeChange]);

  const soldOut = (d: ISODate) => freeByNight[d] === 0;
  const rangeHasSoldOut = (from: ISODate, to: ISODate) => eachDate(from, to).some(soldOut);

  function pick(d: ISODate) {
    if (!checkIn || checkOut || d <= checkIn) {
      if (soldOut(d)) return; // can't start a stay on a sold-out night
      onChange(d, null);
      return;
    }
    if (rangeHasSoldOut(checkIn, d)) {
      if (!soldOut(d)) onChange(d, null);
      return;
    }
    onChange(checkIn, d);
  }

  const previewEnd = checkIn && !checkOut && hover && hover > checkIn && !rangeHasSoldOut(checkIn, hover) ? hover : null;
  const end = checkOut ?? previewEnd;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-pill hover:bg-surface-muted disabled:opacity-30"
          onClick={() => setView(addMonths(view, -1))} disabled={view <= monthStart(minDate)} aria-label="Previous month">‹</button>
        <span className="text-sm text-muted">{checkIn && !checkOut ? "Select check-out date" : "Select check-in date"}</span>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-pill hover:bg-surface-muted disabled:opacity-30"
          onClick={() => setView(addMonths(view, 1))} disabled={addMonths(view, 1) > maxDate} aria-label="Next month">›</button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {months.map((m, i) => (
          <div key={m} className={i === 1 ? "hidden md:block" : ""}>
            <div className="mb-2 text-center font-heading font-semibold">{monthLabel(m)}</div>
            <div className="grid grid-cols-7 text-center text-xs text-muted">
              {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHover(null)}>
              {monthGrid(m).map((d, idx) => {
                if (!d) return <div key={`b${idx}`} />;
                const outOfRange = d < minDate || d > maxDate;
                const isStart = d === checkIn;
                const isEnd = d === end;
                const inRange = checkIn && end && d > checkIn && d < end;
                const sold = soldOut(d);
                // A sold-out date is still selectable as check-out (guest leaves that morning).
                const canBeCheckout = checkIn && !checkOut && d > checkIn && !rangeHasSoldOut(checkIn, d);
                const disabled = outOfRange || (sold && !canBeCheckout);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(d)}
                    onMouseEnter={() => setHover(d)}
                    aria-pressed={isStart || isEnd}
                    aria-label={`${d}${sold ? ", fully booked" : ""}`}
                    className={[
                      "relative mx-auto grid h-10 w-full place-items-center text-sm tabular-nums transition",
                      inRange ? "bg-primary-soft text-foreground" : "",
                      isStart || isEnd ? "rounded-pill bg-primary font-semibold text-primary-foreground" : "rounded-pill",
                      !isStart && !isEnd && !disabled ? "hover:bg-surface-muted" : "",
                      disabled ? "cursor-not-allowed text-muted/40" : "",
                      sold && !outOfRange && !isEnd ? "line-through decoration-danger/60" : "",
                    ].join(" ")}
                  >
                    {+d.slice(8)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        <span className="line-through decoration-danger/60">12</span> = all rooms booked that night
      </p>
    </div>
  );
}

