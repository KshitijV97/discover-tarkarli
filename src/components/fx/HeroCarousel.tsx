"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { img, srcSet } from "@/lib/images";

interface Slide { src: string; alt: string }

/** Full-bleed crossfading slideshow with a slow Ken Burns zoom, swipe and progress dots. */
export function HeroCarousel({ slides, interval = 6500 }: { slides: readonly Slide[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((i: number) => setIndex((i + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => go(index + 1), interval);
    return () => clearTimeout(t);
  }, [index, paused, interval, go]);

  const s = slides[index];
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 60) go(index + (info.offset.x < 0 ? 1 : -1)); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img(s.src, 1800)}
            srcSet={srcSet(s.src, [640, 1080, 1600, 2200])}
            sizes="100vw"
            alt={s.alt}
            className="h-full w-full animate-kenburns object-cover"
            fetchPriority={index === 0 ? "high" : "auto"}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>
      {/* Preload the next slide */}
      <link rel="preload" as="image" href={img(slides[(index + 1) % slides.length].src, 1800)} />

      <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/20 to-ink/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-transparent to-transparent" />

      <div className="absolute bottom-6 right-gutter z-20 flex items-center gap-2 md:right-gutter-desktop">
        {slides.map((_, i) => (
          <button key={i} type="button" aria-label={`Show slide ${i + 1}`} onClick={() => go(i)}
            className="relative h-1.5 w-8 overflow-hidden rounded-pill bg-white/30">
            {i === index && (
              <motion.span key={`${index}-${paused}`} className="absolute inset-y-0 left-0 bg-white"
                initial={{ width: "0%" }} animate={{ width: paused ? "100%" : "100%" }}
                transition={{ duration: paused ? 0 : interval / 1000, ease: "linear" }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
