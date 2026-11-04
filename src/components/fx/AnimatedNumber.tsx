"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue, useTransform, motion } from "framer-motion";

/** Tweens to `value`. With `inView`, counts up when first scrolled into view. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), inView = false, className }: { value: number; format?: (n: number) => string; inView?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const mv = useMotionValue(inView ? 0 : value);
  const text = useTransform(mv, (n) => format(n));
  useEffect(() => {
    if (inView && !seen) return;
    const c = animate(mv, value, { duration: inView ? 1.6 : 0.5, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, seen, inView, mv]);
  return <motion.span ref={ref} className={className}>{text}</motion.span>;
}
