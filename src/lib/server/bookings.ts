import "server-only";
import crypto from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { db } from "./db";
import { getSettings } from "./settings-repo";
import { getRoomsByIds } from "./rooms-repo";
import { notify } from "./notify";
import { getPaymentProvider } from "@/lib/payments";
import { planMeals, type MealLine, type MealSelection, type MealType } from "@/lib/booking/meals";
import { computeQuote, roomGstRate, type Quote, type RoomPriceInput } from "@/lib/booking/pricing";
import { normalizePhone, validateAllocation, validateStay, type RoomAllocation } from "@/lib/booking/rules";
import { paiseToRupeesString, rupeesToPaise } from "@/lib/money";
import type { ISODate } from "@/lib/dates";
import type { AppSettings } from "@/lib/settings";

export class BookingError extends Error {
  constructor(public code: "INVALID" | "UNAVAILABLE" | "NOT_FOUND" | "LOCKED" | "PROVIDER", message: string, public details?: string[]) {
    super(message);
  }
}

export type BookingStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "expired";

export interface BookingDetail {
  id: string;
  reference: string;
  accessToken: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  numGuests: number;
  checkIn: ISODate;
  checkOut: ISODate;
  status: BookingStatus;
  expiresAt: Date | null;
  depositPaid: boolean;
  balancePaid: boolean;
  createdAt: Date;
  rooms: RoomPriceInput[];
  meals: MealLine[];
  quote: Quote;
  /** Stored totals (authoritative for payments) — equal to quote.* unless the deposit was locked in. */
  stored: { subtotal: number; tax: number; total: number; deposit: number };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export interface CreateBookingInput {
  checkIn: ISODate;
  checkOut: ISODate;
  rooms: RoomAllocation[];
  meals: MealSelection[];
  guest: { name: string; phone: string; email: string };
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const newReference = () =>
  "GT-" + Array.from({ length: 6 }, () => REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)]).join("");
const newToken = () => crypto.randomBytes(24).toString("base64url");

export async function createBooking(
  input: CreateBookingInput,
  now = new Date(),
): Promise<{ reference: string; accessToken: string; paymentRequired: boolean }> {
  const settings = await getSettings();

  const stayError = validateStay(input.checkIn, input.checkOut, settings, now);
  if (stayError) throw new BookingError("INVALID", stayError);

  const phone = normalizePhone(input.guest.phone);
  if (!phone) throw new BookingError("INVALID", "Please enter a valid phone number (with country code if outside India).");

  const rooms = await getRoomsByIds(input.rooms.map((r) => r.roomId));
  const allocError = validateAllocation(input.rooms, rooms);
  if (allocError) throw new BookingError("INVALID", allocError);
  const numGuests = input.rooms.reduce((s, r) => s + r.guests, 0);

  const plan = planMeals({ checkIn: input.checkIn, checkOut: input.checkOut, numGuests, selections: input.meals, settings, now });
  if (plan.errors.length) throw new BookingError("INVALID", plan.errors[0], plan.errors);

  const roomInputs: RoomPriceInput[] = input.rooms.map((a) => {
    const room = rooms.find((r) => r.id === a.roomId)!;
    return { roomId: room.id, name: room.name, guests: a.guests, pricePerNight: room.basePrice, gstRate: roomGstRate(room.basePrice, settings) };
  });
  const quote = computeQuote({ checkIn: input.checkIn, checkOut: input.checkOut, rooms: roomInputs, meals: plan.lines, settings });

  // Online deposit only when enabled in settings AND a provider is configured.
  const paymentsEnabled = settings.booking.paymentsEnabled && getPaymentProvider() !== null;
  const status: BookingStatus = paymentsEnabled ? "pending" : "confirmed";
  const expiresAt = paymentsEnabled ? new Date(now.getTime() + settings.booking.holdMinutes * 60_000) : null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = newReference();
    const accessToken = newToken();
    try {
      const bookingId = await db().begin(async (tx) => {
        await tx`select expire_stale_bookings()`;
        const [b] = await tx<{ id: string }[]>`
          insert into bookings (reference, access_token, guest_name, guest_phone, guest_email, num_guests,
                                check_in, check_out, status, expires_at,
                                subtotal_amount, tax_amount, total_amount, deposit_amount)
          values (${reference}, ${accessToken}, ${input.guest.name.trim()}, ${phone}, ${input.guest.email.trim().toLowerCase()},
                  ${numGuests}, ${input.checkIn}, ${input.checkOut}, ${status}, ${expiresAt},
                  ${paiseToRupeesString(quote.subtotal)}, ${paiseToRupeesString(quote.tax)},
                  ${paiseToRupeesString(quote.total)}, ${paiseToRupeesString(quote.deposit)})
          returning id`;
        // stay / blocks_inventory are filled by trigger; the exclusion constraint rejects overlaps.
        await tx`insert into booking_rooms ${tx(
          roomInputs.map((r) => ({
            booking_id: b.id, room_id: r.roomId, guests: r.guests,
            price_per_night: paiseToRupeesString(r.pricePerNight), gst_rate: r.gstRate,
            stay: `[${input.checkIn},${input.checkOut})`,
          })),
        )}`;
        await insertMeals(tx, b.id, plan.lines);
        return b.id;
      });
      const booking = await getBookingById(bookingId);
      if (booking) {
        await notify(paymentsEnabled ? "booking.pending" : "booking.confirmed", {
          booking, dedupeKey: `${paymentsEnabled ? "booking.pending" : "booking.confirmed"}:${bookingId}`,
        });
      }
      return { reference, accessToken, paymentRequired: paymentsEnabled };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "23P01") {
        throw new BookingError("UNAVAILABLE", "Sorry — one of your rooms was just booked for these dates. Please pick another.");
      }
      if (code === "23505" && attempt < 2) continue; // reference/token collision → retry
      throw err;
    }
  }
  throw new Error("unreachable");
}

type Tx = TransactionSql<{}>;

async function insertMeals(tx: Tx, bookingId: string, lines: MealLine[]) {
  if (lines.length === 0) return;
  await tx`insert into booking_meals ${tx(
    lines.map((m) => ({
      booking_id: bookingId, date: m.date, meal_type: m.mealType, quantity: m.quantity,
      price_at_booking: paiseToRupeesString(m.unitPrice), gst_rate: m.gstRate, included_free: m.includedFree,
    })),
  )}`;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
interface BookingRow {
  id: string; reference: string; access_token: string; guest_name: string; guest_phone: string; guest_email: string;
  num_guests: number; check_in: ISODate; check_out: ISODate; status: BookingStatus; expires_at: Date | null;
  subtotal_amount: string; tax_amount: string; total_amount: string; deposit_amount: string;
  deposit_paid: boolean; balance_paid: boolean; created_at: Date;
}

async function loadBooking(sql: Tx | Sql<{}>, where: { token?: string; id?: string }, forUpdate = false) {
  const lock = forUpdate ? sql`for update` : sql``;
  const [b] = where.token
    ? await sql<BookingRow[]>`select * from bookings where access_token = ${where.token} ${lock}`
    : await sql<BookingRow[]>`select * from bookings where id = ${where.id!} ${lock}`;
  if (!b) return null;
  const rooms = await sql<{ room_id: string; name: string; guests: number; price_per_night: string; gst_rate: string }[]>`
    select br.room_id, r.name, br.guests, br.price_per_night, br.gst_rate
    from booking_rooms br join rooms r on r.id = br.room_id
    where br.booking_id = ${b.id} order by r.sort_order`;
  const meals = await sql<{ date: ISODate; meal_type: MealType; quantity: number; price_at_booking: string; gst_rate: string; included_free: boolean }[]>`
    select date, meal_type, quantity, price_at_booking, gst_rate, included_free
    from booking_meals where booking_id = ${b.id} order by date, meal_type`;
  return {
    row: b,
    rooms: rooms.map<RoomPriceInput>((r) => ({
      roomId: r.room_id, name: r.name, guests: r.guests,
      pricePerNight: rupeesToPaise(r.price_per_night), gstRate: Number(r.gst_rate),
    })),
    meals: meals.map<MealLine>((m) => ({
      date: m.date, mealType: m.meal_type, quantity: m.quantity,
      unitPrice: rupeesToPaise(m.price_at_booking), gstRate: Number(m.gst_rate), includedFree: m.included_free,
    })),
  };
}

function toDetail(loaded: NonNullable<Awaited<ReturnType<typeof loadBooking>>>, settings: AppSettings): BookingDetail {
  const b = loaded.row;
  const quote = computeQuote({ checkIn: b.check_in, checkOut: b.check_out, rooms: loaded.rooms, meals: loaded.meals, settings });
  const stored = {
    subtotal: rupeesToPaise(b.subtotal_amount), tax: rupeesToPaise(b.tax_amount),
    total: rupeesToPaise(b.total_amount), deposit: rupeesToPaise(b.deposit_amount),
  };
  // The deposit agreed at booking time is authoritative (settings may have changed since).
  quote.deposit = stored.deposit;
  quote.balance = quote.total - stored.deposit;
  return {
    id: b.id, reference: b.reference, accessToken: b.access_token, guestName: b.guest_name, guestPhone: b.guest_phone,
    guestEmail: b.guest_email, numGuests: b.num_guests, checkIn: b.check_in, checkOut: b.check_out, status: b.status,
    expiresAt: b.expires_at, depositPaid: b.deposit_paid, balancePaid: b.balance_paid, createdAt: b.created_at,
    rooms: loaded.rooms, meals: loaded.meals, quote, stored,
  };
}

export async function getBookingById(id: string): Promise<BookingDetail | null> {
  const [settings, loaded] = await Promise.all([getSettings(), loadBooking(db(), { id })]);
  return loaded ? toDetail(loaded, settings) : null;
}

export async function getBookingByToken(token: string): Promise<BookingDetail | null> {
  if (!token || token.length > 64) return null;
  const [settings, loaded] = await Promise.all([getSettings(), loadBooking(db(), { token })]);
  return loaded ? toDetail(loaded, settings) : null;
}

// ---------------------------------------------------------------------------
// Update meals (guest via token; admin later via id with bypassCutoff)
// ---------------------------------------------------------------------------
const EDITABLE: BookingStatus[] = ["pending", "confirmed", "checked_in"];

export async function updateBookingMeals(
  where: { token?: string; id?: string },
  selections: MealSelection[],
  opts: { bypassCutoff?: boolean; now?: Date } = {},
): Promise<BookingDetail> {
  const settings = await getSettings();
  const now = opts.now ?? new Date();

  const loaded = await db().begin(async (tx) => {
    const current = await loadBooking(tx, where, true);
    if (!current) throw new BookingError("NOT_FOUND", "Booking not found.");
    const b = current.row;
    if (!EDITABLE.includes(b.status)) throw new BookingError("LOCKED", `This booking is ${b.status.replace("_", " ")} and can't be changed.`);

    const plan = planMeals({
      checkIn: b.check_in, checkOut: b.check_out, numGuests: b.num_guests, selections, settings, now,
      existing: current.meals, enforceCutoff: !opts.bypassCutoff,
    });
    if (plan.errors.length) throw new BookingError("INVALID", plan.errors[0], plan.errors);

    const quote = computeQuote({ checkIn: b.check_in, checkOut: b.check_out, rooms: current.rooms, meals: plan.lines, settings });
    // Deposit is fixed once paid; before payment it follows the new total.
    const deposit = b.deposit_paid ? rupeesToPaise(b.deposit_amount) : quote.deposit;

    await tx`delete from booking_meals where booking_id = ${b.id}`;
    await insertMeals(tx, b.id, plan.lines);
    await tx`
      update bookings set subtotal_amount = ${paiseToRupeesString(quote.subtotal)},
        tax_amount = ${paiseToRupeesString(quote.tax)}, total_amount = ${paiseToRupeesString(quote.total)},
        deposit_amount = ${paiseToRupeesString(deposit)}
      where id = ${b.id}`;
    return loadBooking(tx, { id: b.id });
  });

  const detail = toDetail(loaded!, settings);
  await notify("booking.meals_updated", { booking: detail });
  return detail;
}
