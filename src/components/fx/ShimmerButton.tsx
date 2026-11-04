import Link from "next/link";
import type { ReactNode } from "react";

/** CTA with a slowly rotating gradient border and a sheen. Server-safe (CSS only). */
export function ShimmerButton({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`group relative inline-flex min-h-12 overflow-hidden rounded-pill p-[1.5px] shadow-raised ${className}`}>
      <span aria-hidden className="absolute inset-[-200%] animate-spin-slow bg-[conic-gradient(from_90deg,rgb(var(--color-gold)),rgb(var(--color-accent)),rgb(var(--color-primary)),rgb(var(--color-gold)))]" />
      <span className="relative inline-flex items-center gap-2 rounded-pill bg-accent px-7 font-semibold text-accent-foreground transition group-hover:bg-accent/90">
        <span aria-hidden className="absolute inset-0 rounded-pill bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%)] bg-[length:200%_100%] animate-shimmer" />
        <span className="relative">{children}</span>
      </span>
    </Link>
  );
}
