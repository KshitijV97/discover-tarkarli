"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/money";
import { changeStayAction, type ActionResult } from "./actions";

export interface StayRoomOption { id: string; name: string; maxOccupancy: number; pricePerNight: number; hidden: boolean }

const inputClass = "block h-12 w-full rounded-md border border-border bg-surface px-3.5 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

/** Change dates, rooms and guests. Collapsed by default so it isn't changed by accident. */
export function StayEditor({ bookingId, checkIn, checkOut, arrived, rooms, current }: {
  bookingId: string; checkIn: string; checkOut: string; arrived: boolean;
  rooms: StayRoomOption[]; current: { roomId: string; guests: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Record<string, number>>(() => Object.fromEntries(current.map((r) => [r.roomId, r.guests])));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => {
      const res = await changeStayAction(bookingId, data);
      setResult(res);
      if (res.ok) setOpen(false);
    });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button variant="outline" onClick={() => { setOpen(true); setResult(null); }}>Change dates or rooms…</Button>
        {result && <p role="status" className={`text-sm ${result.ok ? "text-success" : "text-danger"}`}>{result.message}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Check-in</span>
          <input type="date" name="checkIn" defaultValue={checkIn} readOnly={arrived} className={`${inputClass} ${arrived ? "bg-surface-muted" : ""}`} />
          {arrived && <span className="mt-1 block text-xs text-muted">The guest has arrived, so only check-out can move.</span>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Check-out</span>
          <input type="date" name="checkOut" defaultValue={checkOut} className={inputClass} />
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Rooms and guests</legend>
        <ul className="divide-y divide-border rounded-md border border-border">
          {rooms.map((r) => {
            const on = r.id in selected;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" name="room" value={r.id} checked={on} className="h-5 w-5 accent-primary"
                    onChange={(e) => setSelected((s) => { const n = { ...s }; if (e.target.checked) n[r.id] = 1; else delete n[r.id]; return n; })} />
                  <span>
                    <span className="font-medium">{r.name}</span>
                    <span className="block text-xs text-muted">sleeps {r.maxOccupancy} · {formatINR(r.pricePerNight)}/night{r.hidden ? " · hidden from the site" : ""}</span>
                  </span>
                </label>
                {on && (
                  <label className="flex items-center gap-2 text-sm">
                    Guests
                    <input type="number" name={`guests:${r.id}`} min={1} max={r.maxOccupancy} value={selected[r.id]}
                      onChange={(e) => setSelected((s) => ({ ...s, [r.id]: Number(e.target.value) }))}
                      className="h-11 w-20 rounded-md border border-border bg-surface px-3 text-base" />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">Rooms already on the booking keep the price they were booked at. Added rooms use today&apos;s price. Meals that no longer fit the dates are dropped.</p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
        {result && !result.ok && <p role="status" className="text-sm text-danger">{result.message}</p>}
      </div>
    </form>
  );
}
