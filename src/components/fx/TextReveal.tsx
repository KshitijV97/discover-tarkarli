"use client";

import { motion } from "framer-motion";

/** Headline that resolves word by word from a soft blur. */
export function TextReveal({ text, className, delay = 0, as = "h1" }: { text: string; className?: string; delay?: number; as?: "h1" | "h2" | "p" }) {
  const M = motion[as];
  const words = text.split(" ");
  return (
    <M className={className} initial="hidden" animate="show" aria-label={text}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: delay } } }}>
      {words.map((w, i) => (
        <motion.span key={i} aria-hidden className="inline-block whitespace-pre"
          variants={{ hidden: { opacity: 0, y: "0.35em", filter: "blur(10px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}>
          {w}{i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </M>
  );
}
