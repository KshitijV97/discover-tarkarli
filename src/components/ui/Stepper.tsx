"use client";

/** Compact −/+ quantity control with 44px touch targets. */
export function Stepper({
  value, min = 0, max, onChange, disabled, label,
}: { value: number; min?: number; max: number; onChange: (v: number) => void; disabled?: boolean; label: string }) {
  const btn = "grid h-9 w-9 place-items-center rounded-pill border border-border bg-surface text-lg leading-none text-foreground transition hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface";
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={btn} aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
