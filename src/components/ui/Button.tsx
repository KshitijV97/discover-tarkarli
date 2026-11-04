import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "outline" | "ghost";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  accent: "bg-accent text-accent-foreground hover:bg-accent/90",
  outline: "border border-border bg-surface text-foreground hover:bg-surface-muted",
  ghost: "text-primary hover:bg-primary-soft",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }>(
  function Button({ variant = "primary", block, className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${block ? "w-full" : ""} ${className}`}
        {...props}
      />
    );
  },
);
