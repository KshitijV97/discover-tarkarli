"use client";

import { formatINR, type Paise } from "@/lib/money";
import { Stepper } from "@/components/ui/Stepper";
import { PhotoCarousel } from "@/components/fx/Carousel";
import { img } from "@/lib/images";

export interface RoomView {
  id: string;
  name: string;
  description: string;
  maxOccupancy: number;
  basePrice: Paise;
  photos: string[];
  amenities: string[];
}

interface Props {
  room: RoomView;
  available: boolean | null; // null = dates not chosen / loading
  guests: number | null; // null = not selected
  nights: number;
  onToggle: () => void;
  onGuestsChange: (n: number) => void;
}

export function RoomPhoto({ room, className = "" }: { room: Pick<RoomView, "name" | "photos">; className?: string }) {
  if (room.photos.length > 1) return <PhotoCarousel photos={room.photos.map((p) => img(p, 800))} alt={room.name} className={className} />;
  if (room.photos[0]) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img(room.photos[0], 800)} alt={room.name} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-primary/80 via-primary/60 to-gold/70 ${className}`} aria-hidden>
      <div className="absolute -bottom-6 left-0 right-0 h-16 rounded-[50%] bg-background/25" />
      <div className="absolute right-4 top-4 h-8 w-8 rounded-pill bg-gold/90" />
    </div>
  );
}

export function RoomCard({ room, available, guests, nights, onToggle, onGuestsChange }: Props) {
  const selected = guests !== null;
  const soldOut = available === false;
  return (
    <article
      className={`group overflow-hidden rounded-card border bg-surface shadow-card transition duration-300 hover:shadow-raised ${selected ? "border-primary ring-2 ring-primary/30" : "border-border"} ${soldOut ? "opacity-60" : ""}`}
    >
      <div className="flex flex-col sm:flex-row">
        <RoomPhoto room={room} className="h-48 w-full sm:h-auto sm:min-h-52 sm:w-60 sm:shrink-0" />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{room.name}</h3>
              <p className="text-sm text-muted">Sleeps up to {room.maxOccupancy} · Breakfast included</p>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatINR(room.basePrice)}</div>
              <div className="text-xs text-muted">per night + GST</div>
            </div>
          </div>
          <p className="text-sm text-foreground/80">{room.description}</p>
          {room.amenities.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {room.amenities.map((a) => (
                <li key={a} className="rounded-pill bg-surface-muted px-2.5 py-0.5 text-xs text-foreground/80">{a}</li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            {soldOut ? (
              <span className="text-sm font-medium text-danger">Not available for these dates</span>
            ) : selected ? (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted">Guests</span>
                  <Stepper label={`guests in ${room.name}`} value={guests} min={1} max={room.maxOccupancy} onChange={onGuestsChange} />
                </div>
                <button type="button" onClick={onToggle} className="text-sm font-medium text-danger hover:underline">Remove</button>
              </>
            ) : (
              <>
                <span className="text-sm text-muted">
                  {available === null ? "Choose dates to check availability" : nights > 0 ? `${formatINR(room.basePrice * nights)} for ${nights} night${nights > 1 ? "s" : ""}` : ""}
                </span>
                <button
                  type="button"
                  onClick={onToggle}
                  disabled={available !== true}
                  className="min-h-10 rounded-pill bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  Select room
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
