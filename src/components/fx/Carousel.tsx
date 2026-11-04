"use client";

import { Children, useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

interface Props {
  children: ReactNode;
  /** Tailwind basis classes for each slide, e.g. "basis-[85%] sm:basis-1/2 lg:basis-1/3" */
  slideClassName?: string;
  autoplay?: number | false;
  loop?: boolean;
  arrows?: boolean;
  dots?: boolean;
  className?: string;
  label: string;
}

/** Draggable, swipeable carousel (Embla) with optional autoplay, arrows and dots. */
export function Carousel({ children, slideClassName = "basis-full", autoplay = false, loop = true, arrows = true, dots = true, className = "", label }: Props) {
  const [ref, api] = useEmblaCarousel(
    { loop, align: "start", skipSnaps: false },
    autoplay ? [Autoplay({ delay: autoplay, stopOnInteraction: false, stopOnMouseEnter: true })] : [],
  );
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => { if (api) setSelected(api.selectedScrollSnap()); }, [api]);
  useEffect(() => {
    if (!api) return;
    setSnaps(api.scrollSnapList());
    onSelect();
    api.on("select", onSelect).on("reInit", () => { setSnaps(api.scrollSnapList()); onSelect(); });
  }, [api, onSelect]);

  const arrow = "grid h-10 w-10 place-items-center rounded-pill border border-border bg-surface/90 text-foreground shadow-card backdrop-blur transition hover:bg-surface disabled:opacity-40";
  return (
    <div className={`relative ${className}`} role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="overflow-hidden" ref={ref}>
        <div className="-ml-4 flex touch-pan-y">
          {Children.map(children, (child, i) => (
            <div className={`min-w-0 shrink-0 grow-0 pl-4 ${slideClassName}`} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${Children.count(children)}`}>
              {child}
            </div>
          ))}
        </div>
      </div>
      {(arrows || dots) && snaps.length > 1 && (
        <div className="mt-5 flex items-center justify-between gap-4">
          {dots ? (
            <div className="flex gap-1.5">
              {snaps.map((_, i) => (
                <button key={i} type="button" aria-label={`Go to slide ${i + 1}`} onClick={() => api?.scrollTo(i)}
                  className={`h-1.5 rounded-pill transition-all ${i === selected ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
              ))}
            </div>
          ) : <span />}
          {arrows && (
            <div className="flex gap-2">
              <button type="button" className={arrow} aria-label="Previous" onClick={() => api?.scrollPrev()}>‹</button>
              <button type="button" className={arrow} aria-label="Next" onClick={() => api?.scrollNext()}>›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Minimal image carousel for cards (swipe + tiny dots overlay). */
export function PhotoCarousel({ photos, alt, className = "" }: { photos: string[]; alt: string; className?: string }) {
  const [ref, api] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  useEffect(() => { if (api) api.on("select", () => setSelected(api.selectedScrollSnap())); }, [api]);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="h-full overflow-hidden" ref={ref}>
        <div className="flex h-full touch-pan-y">{photos.map((p, i) => (
          <div key={i} className="h-full min-w-0 shrink-0 grow-0 basis-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt={`${alt} — photo ${i + 1}`} loading="lazy" draggable={false} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          </div>
        ))}</div>
      </div>
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {photos.map((_, i) => (
            <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={(e) => { e.stopPropagation(); api?.scrollTo(i); }}
              className={`h-1.5 rounded-pill transition-all ${i === selected ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
