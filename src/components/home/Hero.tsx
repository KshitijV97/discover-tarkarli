"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { HeroCarousel } from "@/components/fx/HeroCarousel";
import { TextReveal } from "@/components/fx/TextReveal";
import { addDays, type ISODate } from "@/lib/dates";
import { site } from "@/content/site";

/** Full-viewport hero: photo carousel, word-by-word headline, glass quick-search. */
export function Hero({ today }: { today: ISODate }) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(addDays(today, 7));
  const [checkOut, setCheckOut] = useState(addDays(today, 9));

  return (
    <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden text-white">
      <HeroCarousel slides={site.hero.slides} />
      <div className="container-page relative z-10 pb-24 pt-32 md:pb-28">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="mb-4 inline-flex items-center gap-2 rounded-pill glass px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-gold" /> {site.hero.eyebrow}
        </motion.p>
        <TextReveal text={site.hero.title} delay={0.2}
          className="max-w-3xl text-balance text-[2.6rem] font-semibold leading-[1.02] sm:text-6xl md:text-7xl" />
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7 }}
          className="mt-5 max-w-xl text-base text-white/85 md:text-lg">
          {site.hero.subtitle}
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          onSubmit={(e) => { e.preventDefault(); router.push(`/book?checkIn=${checkIn}&checkOut=${checkOut}`); }}
          className="mt-8 grid max-w-2xl grid-cols-2 gap-2 rounded-card glass p-2 shadow-raised sm:grid-cols-[1fr_1fr_auto]"
        >
          <DateField label="Check-in" value={checkIn} min={today} onChange={(v) => { setCheckIn(v); if (v >= checkOut) setCheckOut(addDays(v, 1)); }} />
          <DateField label="Check-out" value={checkOut} min={addDays(checkIn, 1)} onChange={setCheckOut} />
          <button type="submit" className="col-span-2 min-h-12 rounded-md bg-accent px-6 font-semibold text-accent-foreground transition hover:bg-accent/90 sm:col-span-1">
            Check availability
          </button>
        </motion.form>
      </div>
      <div aria-hidden className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 md:block">
        <div className="flex h-9 w-5 justify-center rounded-pill border border-white/50 pt-1.5">
          <span className="h-1.5 w-1 animate-scroll-cue rounded-pill bg-white" />
        </div>
      </div>
    </section>
  );
}

function DateField({ label, value, min, onChange }: { label: string; value: string; min: string; onChange: (v: string) => void }) {
  return (
    <label className="rounded-md bg-white/10 px-3 py-2 transition focus-within:bg-white/20">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-white/70">{label}</span>
      <input type="date" value={value} min={min} required onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-semibold text-white [color-scheme:dark] focus:outline-none" />
    </label>
  );
}
