import type { InputHTMLAttributes } from "react";

export function Field({ label, error, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        id={fieldId}
        className={`block h-12 w-full rounded-md border bg-surface px-3.5 text-base text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${error ? "border-danger" : "border-border"}`}
        aria-invalid={!!error}
        {...props}
      />
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
