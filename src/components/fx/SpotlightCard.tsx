"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

/** Card with a soft radial glow that follows the cursor. */
export function SpotlightCard({ children, className = "", glow = "rgb(var(--color-gold) / 0.28)" }: { children: ReactNode; className?: string; glow?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const bg = useMotionTemplate`radial-gradient(420px circle at ${x}px ${y}px, ${glow}, transparent 70%)`;
  return (
    <div
      ref={ref}
      onMouseMove={(e) => { const r = ref.current!.getBoundingClientRect(); x.set(e.clientX - r.left); y.set(e.clientY - r.top); }}
      onMouseLeave={() => { x.set(-400); y.set(-400); }}
      className={`group relative overflow-hidden ${className}`}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: bg }} />
      {children}
    </div>
  );
}
