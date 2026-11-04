/** Stay and occupancy validation (pure — shared by client and server). */
import { addDays, diffDays, isISODate, todayInTz, type ISODate } from "@/lib/dates";
import type { AppSettings } from "@/lib/settings";

export function validateStay(checkIn: string, checkOut: string, settings: AppSettings, now: Date = new Date()): string | null {
  if (!isISODate(checkIn) || !isISODate(checkOut)) return "Please choose valid dates.";
  const today = todayInTz(settings.property.timezone, now);
  const b = settings.booking;
  if (checkIn < today) return "Check-in can't be in the past.";
  if (checkIn > addDays(today, b.maxAdvanceDays)) return `Bookings open up to ${b.maxAdvanceDays} days ahead.`;
  const nights = diffDays(checkIn, checkOut);
  if (nights < b.minNights) return b.minNights === 1 ? "Check-out must be after check-in." : `Minimum stay is ${b.minNights} nights.`;
  if (nights > b.maxNights) return `Maximum stay is ${b.maxNights} nights.`;
  return null;
}

export interface RoomAllocation {
  roomId: string;
  guests: number;
}

export function validateAllocation(
  allocation: RoomAllocation[],
  rooms: { id: string; name: string; maxOccupancy: number }[],
): string | null {
  if (allocation.length === 0) return "Please select at least one room.";
  const seen = new Set<string>();
  for (const a of allocation) {
    const room = rooms.find((r) => r.id === a.roomId);
    if (!room) return "One of the selected rooms is no longer available.";
    if (seen.has(a.roomId)) return `${room.name} is selected twice.`;
    seen.add(a.roomId);
    if (!Number.isInteger(a.guests) || a.guests < 1) return `${room.name} needs at least 1 guest.`;
    if (a.guests > room.maxOccupancy) return `${room.name} sleeps up to ${room.maxOccupancy}.`;
  }
  return null;
}

/** Normalise Indian / international phone numbers to E.164 (+91XXXXXXXXXX). */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return "+91" + digits;
  if (/^0[6-9]\d{9}$/.test(digits)) return "+91" + digits.slice(1);
  if (/^91[6-9]\d{9}$/.test(digits)) return "+" + digits;
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  return null;
}

export type { ISODate };
