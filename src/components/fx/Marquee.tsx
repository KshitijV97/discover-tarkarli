import type { ReactNode } from "react";

/** Infinite horizontal scroller (CSS only). Content is duplicated for a seamless loop; pauses on hover. */
export function Marquee({ children, reverse, duration = 40, gap = "1rem", className = "" }: { children: ReactNode; reverse?: boolean; duration?: number; gap?: string; className?: string }) {
  return (
    <div className={`group flex overflow-hidden mask-fade-x ${className}`} style={{ ["--marquee-duration" as string]: `${duration}s`, ["--marquee-gap" as string]: gap, gap }}>
      {[0, 1].map((i) => (
        <div key={i} aria-hidden={i === 1} className={`flex shrink-0 items-stretch group-hover:[animation-play-state:paused] ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`} style={{ gap }}>
          {children}
        </div>
      ))}
    </div>
  );
}
