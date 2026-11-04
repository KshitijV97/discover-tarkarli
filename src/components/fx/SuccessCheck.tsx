"use client";

import { motion } from "framer-motion";

/** Animated check mark that draws itself. */
export function SuccessCheck({ size = 44 }: { size?: number }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 52 52" initial="hidden" animate="show" className="shrink-0" aria-hidden>
      <motion.circle cx="26" cy="26" r="24" fill="none" stroke="rgb(var(--color-gold))" strokeWidth="3"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.6, ease: "easeOut" } } }} />
      <motion.path d="M15 27 l7 7 l15 -16" fill="none" stroke="rgb(var(--color-gold))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { delay: 0.5, duration: 0.4, ease: "easeOut" } } }} />
    </motion.svg>
  );
}
