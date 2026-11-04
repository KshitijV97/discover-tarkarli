"use client";

import Link from "next/link";
import { Carousel, PhotoCarousel } from "@/components/fx/Carousel";
import { TiltCard } from "@/components/fx/TiltCard";
import { formatINR, type Paise } from "@/lib/money";
import { img } from "@/lib/images";

export interface ShowcaseRoom { id: string; slug: string; name: string; description: string; maxOccupancy: number; basePrice: Paise; photos: string[]; amenities: string[] }

export function RoomsShowcase({ rooms }: { rooms: ShowcaseRoom[] }) {
  return (
    <Carousel label="Rooms" slideClassName="basis-[86%] sm:basis-1/2 lg:basis-1/3" autoplay={5000}>
      {rooms.map((r) => (
        <TiltCard key={r.id} className="h-full">
          <article className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow duration-500 hover:shadow-raised">
            <div className="relative">
              {r.photos.length ? (
                <PhotoCarousel photos={r.photos.map((p) => img(p, 900))} alt={r.name} className="aspect-[4/3]" />
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-primary/70 to-gold/60" />
              )}
              <span className="absolute left-3 top-3 rounded-pill bg-ink/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">Sleeps {r.maxOccupancy}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-semibold">{r.name}</h3>
                <p className="shrink-0 text-right"><span className="font-semibold">{formatINR(r.basePrice)}</span><span className="text-xs text-muted"> /night</span></p>
              </div>
              <p className="line-clamp-2 text-sm text-muted">{r.description}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {r.amenities.slice(0, 3).map((a) => <li key={a} className="rounded-pill bg-surface-muted px-2.5 py-0.5 text-xs">{a}</li>)}
              </ul>
              <Link href="/book" className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-primary">
                Check dates <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </article>
        </TiltCard>
      ))}
    </Carousel>
  );
}
