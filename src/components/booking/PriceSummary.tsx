import { formatDate, type ISODate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { Quote } from "@/lib/booking/pricing";
import { mealLabel, type MealType } from "@/lib/booking/meals";

interface Props {
  quote: Quote;
  checkIn: ISODate;
  checkOut: ISODate;
  intraState: boolean;
  compact?: boolean;
}

export function PriceSummary({ quote, checkIn, checkOut, intraState, compact }: Props) {
  // Aggregate meals per type for a readable summary.
  const mealsByType = new Map<MealType, { qty: number; amount: number; free: boolean }>();
  for (const m of quote.meals) {
    const k = mealsByType.get(m.mealType) ?? { qty: 0, amount: 0, free: m.includedFree };
    k.qty += m.quantity;
    k.amount += m.amount;
    mealsByType.set(m.mealType, k);
  }
  const row = "flex justify-between gap-4";
  return (
    <div className="space-y-3 text-sm">
      <div className="text-muted">
        {formatDate(checkIn)} → {formatDate(checkOut)} · {quote.nights} night{quote.nights === 1 ? "" : "s"}
      </div>
      {quote.rooms.length === 0 && <p className="text-muted">No rooms selected yet.</p>}
      {quote.rooms.map((r) => (
        <div key={r.roomId} className={row}>
          <span>{r.name} <span className="text-muted">· {r.guests} guest{r.guests > 1 ? "s" : ""}, {formatINR(r.pricePerNight)} × {r.nights}</span></span>
          <span className="tabular-nums">{formatINR(r.amount)}</span>
        </div>
      ))}
      {[...mealsByType.entries()].map(([type, m]) => (
        <div key={type} className={row}>
          <span>{mealLabel(type)} <span className="text-muted">· {m.qty} meal{m.qty === 1 ? "" : "s"}</span></span>
          <span className={`tabular-nums ${m.free ? "text-success" : ""}`}>{m.free ? "Included" : formatINR(m.amount)}</span>
        </div>
      ))}
      {!compact && quote.subtotal > 0 && (
        <div className="space-y-1 border-t border-border pt-3 text-muted">
          <div className={row}><span>Subtotal</span><span className="tabular-nums">{formatINR(quote.subtotal)}</span></div>
          {quote.taxBreakdown.filter((b) => b.tax > 0).map((b) =>
            intraState ? (
              <div key={b.rate} className={row}>
                <span>CGST {b.rate / 2}% + SGST {b.rate / 2}% <span className="text-xs">on {formatINR(b.taxable)}</span></span>
                <span className="tabular-nums">{formatINR(b.tax)}</span>
              </div>
            ) : (
              <div key={b.rate} className={row}>
                <span>IGST {b.rate}% <span className="text-xs">on {formatINR(b.taxable)}</span></span>
                <span className="tabular-nums">{formatINR(b.tax)}</span>
              </div>
            ),
          )}
        </div>
      )}
      <div className={`${row} border-t border-border pt-3 text-base font-semibold`}>
        <span>Total</span><span className="tabular-nums">{formatINR(quote.total)}</span>
      </div>
      {quote.total > 0 && (
        <div className="space-y-1 rounded-md bg-surface-muted p-3">
          <div className={`${row} font-semibold text-primary`}><span>Deposit due now</span><span className="tabular-nums">{formatINR(quote.deposit)}</span></div>
          <div className={`${row} text-muted`}><span>Balance due at property</span><span className="tabular-nums">{formatINR(quote.balance)}</span></div>
        </div>
      )}
    </div>
  );
}
