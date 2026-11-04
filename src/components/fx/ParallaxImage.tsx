"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { img, srcSet } from "@/lib/images";

/** Image that drifts slower than the page as you scroll. */
export function ParallaxImage({ src, alt, className = "", strength = 60 }: { src: string; alt: string; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-strength, strength]);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="absolute inset-[-12%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(src, 1400)} srcSet={srcSet(src)} sizes="(min-width: 1024px) 50vw, 100vw" alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </motion.div>
    </div>
  );
}
