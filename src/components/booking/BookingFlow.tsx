"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, diffDays, formatDate, type ISODate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { AppSettings } from "@/lib/settings";
import { mealSlots, planMeals, slotKey } from "@/lib/booking/meals";
import { computeQuote, roomGstRate, type RoomPriceInput } from "@/lib/booking/pricing";
import { normalizePhone, validateStay } from "@/lib/booking/rules";
import { DateRangeCalendar } from "./DateRangeCalendar";
import { RoomCard, type RoomView } from "./RoomCard";
import { MealPlanner, valuesToSelections, type MealValues } from "./MealPlanner";
import { PriceSummary } from "./PriceSummary";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

const STEPS = ["Dates", "Rooms", "Meals", "Details"] as const;
type Step = 0 | 1 | 2 | 3;

interface Props {
  rooms: RoomView[];
  settings: AppSettings;
  today: ISODate;
  serverNow: string;
  initialCheckIn?: ISODate | null;
  initialCheckOut?: ISODate | null;
  /** True when the deposit is collected online (provider configured + enabled). */
  paymentsOnline: boolean;
}

export function BookingFlow({ rooms, settings, today, serverNow, initialCheckIn = null, initialCheckOut = null, paymentsOnline }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialCheckIn && initialCheckOut ? 1 : 0);
  const [checkIn, setCheckIn] = useState<ISODate | null>(initialCheckIn);
  const [checkOut, setCheckOut] = useState<ISODate | null>(initialCheckOut);
  const [freeByNight, setFreeByNight] = useState<Record<ISODate, number>>({});
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({}); // roomId → guests
  const [mealValues, setMealValues] = useState<MealValues>({});
  const [guest, setGuest] = useState({ name: "", phone: "", email: "" });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date(serverNow));
  const [availabilityVersion, setAvailabilityVersion] = useState(0); // bump to refetch

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const maxDate = addDays(today, settings.booking.maxAdvanceDays);
  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;

  // --- Calendar availability (sold-out nights) -------------------------------
  const loadCalendar = useCallback(async (from: ISODate, to: ISODate) => {
    const start = from < today ? today : from;
    if (start >= to) return;
    try {
      const res = await fetch(`/api/availability/calendar?from=${start}&to=${to}`);
      if (res.ok) {
        const data = (await res.json()) as { free: Record<ISODate, number> };
        setFreeByNight((prev) => ({ ...prev, ...data.free }));
      }
    } catch { /* non-critical: calendar just won't show sold-out nights */ }
  }, [today]);

  // --- Room availability for the chosen dates --------------------------------
  useEffect(() => {
    if (!checkIn || !checkOut) { setAvailableIds(null); return; }
    const ctrl = new AbortController();
    setAvailableIds(null);
    setAvailabilityError(null);
    fetch(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}`, { signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't load availability");
        const ids = new Set<string>(data.availableRoomIds);
        setAvailableIds(ids);
        // Drop any selected rooms that are no longer free.
        setSelected((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => ids.has(id))));
      })
      .catch((e) => { if (e.name !== "AbortError") setAvailabilityError(e.message); });
    return () => ctrl.abort();
  }, [checkIn, checkOut, availabilityVersion]);

  // --- Derived booking state --------------------------------------------------
  const numGuests = Object.values(selected).reduce((s, g) => s + g, 0);

  const validMealSelections = useMemo(() => {
    if (!checkIn || !checkOut || numGuests === 0) return [];
    const valid = new Set(mealSlots(checkIn, checkOut, settings.meals.breakfastIncluded).map((s) => slotKey(s.date, s.mealType)));
    return valuesToSelections(mealValues)
      .filter((s) => valid.has(slotKey(s.date, s.mealType)))
      .map((s) => ({ ...s, quantity: Math.min(s.quantity, numGuests) }));
  }, [mealValues, checkIn, checkOut, numGuests, settings.meals.breakfastIncluded]);

  const quote = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    const roomInputs: RoomPriceInput[] = rooms
      .filter((r) => selected[r.id])
      .map((r) => ({ roomId: r.id, name: r.name, guests: selected[r.id], pricePerNight: r.basePrice, gstRate: roomGstRate(r.basePrice, settings) }));
    const meals = numGuests > 0
      ? planMeals({ checkIn, checkOut, numGuests, selections: validMealSelections, settings, now, enforceCutoff: false }).lines
      : [];
    return computeQuote({ checkIn, checkOut, rooms: roomInputs, meals, settings });
  }, [checkIn, checkOut, rooms, selected, numGuests, validMealSelections, settings, now]);

  const stayError = checkIn && checkOut ? validateStay(checkIn, checkOut, settings, now) : null;
  const guestErrors = {
    name: guest.name.trim().length < 2 ? "Please enter your name" : undefined,
    phone: !normalizePhone(guest.phone) ? "Enter a valid mobile number" : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim()) ? "Enter a valid email" : undefined,
  };
  const guestValid = !guestErrors.name && !guestErrors.phone && !guestErrors.email;

  const canContinue = [
    !!checkIn && !!checkOut && !stayError,
    Object.keys(selected).length > 0,
    true,
    guestValid && !submitting,
  ][step];

  // --- Actions ----------------------------------------------------------------
  function onDatesChange(ci: ISODate | null, co: ISODate | null) {
    setCheckIn(ci);
    setCheckOut(co);
    setSubmitError(null);
  }

  function toggleRoom(room: RoomView) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[room.id]) delete next[room.id];
      else next[room.id] = Math.min(2, room.maxOccupancy);
      return next;
    });
  }

  async function submit() {
    setTouched(true);
    if (!guestValid || !checkIn || !checkOut) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn, checkOut,
          rooms: Object.entries(selected).map(([roomId, guests]) => ({ roomId, guests })),
          meals: validMealSelections.filter((s) => s.quantity > 0),
          guest,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Booking failed");
        if (res.status === 409) { setStep(1); setAvailabilityVersion((v) => v + 1); }
        return;
      }
      router.push(`${data.manageUrl}?new=1${data.paymentRequired ? "&pay=1" : ""}`);
    } catch {
      setSubmitError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!canContinue) { if (step === 3) setTouched(true); return; }
    if (step === 3) void submit();
    else { setStep((s) => (s + 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  const nextLabel = ["Choose rooms", "Plan meals", "Guest details", submitting ? "Booking…" : paymentsOnline ? "Continue to payment" : "Confirm booking"][step];

  // --- Render -----------------------------------------------------------------
  return (
    <div className="container-page pb-32 pt-6 lg:pb-10">
      {/* Step indicator */}
      <ol className="no-scrollbar mb-6 flex items-center gap-2 overflow-x-auto text-sm">
        {STEPS.map((label, i) => {
          const reachable = i <= step || (i === step + 1 && canContinue);
          return (
            <li key={label} className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={!reachable || i > step}
                onClick={() => setStep(i as Step)}
                className={`flex items-center gap-2 rounded-pill px-3 py-1.5 font-medium ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary-soft text-primary" : "text-muted"}`}
              >
                <span className="tabular-nums">{i + 1}</span> {label}
              </button>
              {i < STEPS.length - 1 && <span className="text-border">—</span>}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-live="polite">
          {step === 0 && (
            <Card className="p-4 sm:p-6">
              <h1 className="mb-1 text-2xl font-semibold">When are you coming?</h1>
              <p className="mb-5 text-sm text-muted">
                Check-in from {settings.booking.checkInTime}, check-out by {settings.booking.checkOutTime}.
              </p>
              <DateRangeCalendar
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={onDatesChange}
                minDate={today}
                maxDate={maxDate}
                freeByNight={freeByNight}
                onVisibleRangeChange={loadCalendar}
              />
              {stayError && <p className="mt-3 text-sm text-danger">{stayError}</p>}
            </Card>
          )}

          {step === 1 && checkIn && checkOut && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold">Choose your rooms</h1>
                <p className="text-sm text-muted">
                  {formatDate(checkIn)} → {formatDate(checkOut)} · {nights} night{nights > 1 ? "s" : ""}. Select one or more rooms and set guests for each.
                </p>
              </div>
              {availabilityError && <p className="text-sm text-danger">{availabilityError}</p>}
              {submitError && <p className="rounded-md bg-danger/10 p-3 text-sm text-danger">{submitError}</p>}
              {availableIds && availableIds.size === 0 && (
                <p className="rounded-md bg-warning/10 p-3 text-sm">All rooms are booked for these dates. Try different dates.</p>
              )}
              {[...rooms]
                .sort((a, b) => Number(availableIds?.has(b.id) ?? 0) - Number(availableIds?.has(a.id) ?? 0))
                .map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    nights={nights}
                    available={availableIds ? availableIds.has(room.id) : null}
                    guests={selected[room.id] ?? null}
                    onToggle={() => toggleRoom(room)}
                    onGuestsChange={(g) => setSelected((p) => ({ ...p, [room.id]: g }))}
                  />
                ))}
            </div>
          )}

          {step === 2 && checkIn && checkOut && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold">Plan your meals</h1>
                <p className="text-sm text-muted">Optional. Choose how many of your {numGuests} guest{numGuests > 1 ? "s" : ""} will eat each meal. You can change this later.</p>
              </div>
              <MealPlanner
                checkIn={checkIn}
                checkOut={checkOut}
                numGuests={numGuests}
                settings={settings}
                values={mealValues}
                onChange={setMealValues}
                now={now}
              />
            </div>
          )}

          {step === 3 && (
            <Card className="space-y-4 p-4 sm:p-6">
              <div>
                <h1 className="text-2xl font-semibold">Your details</h1>
                <p className="text-sm text-muted">We&apos;ll send your confirmation and booking link on WhatsApp and email.</p>
              </div>
              <Field label="Full name" name="name" autoComplete="name" value={guest.name}
                onChange={(e) => setGuest({ ...guest, name: e.target.value })} error={touched ? guestErrors.name : undefined} />
              <Field label="Mobile (WhatsApp)" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210"
                hint="Indian numbers can skip +91. Others, include the country code."
                value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} error={touched ? guestErrors.phone : undefined} />
              <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" value={guest.email}
                onChange={(e) => setGuest({ ...guest, email: e.target.value })} error={touched ? guestErrors.email : undefined} />
              {submitError && <p className="rounded-md bg-danger/10 p-3 text-sm text-danger">{submitError}</p>}
              {quote && (
                <p className="text-xs text-muted">
                  {paymentsOnline
                    ? `Next, you'll pay a deposit of ${formatINR(quote.deposit)} securely via Razorpay. Your room is held for ${settings.booking.holdMinutes} minutes while you pay.`
                    : `Our team will contact you to collect the deposit of ${formatINR(quote.deposit)}.`}
                </p>
              )}
            </Card>
          )}

          {/* Desktop nav */}
          <div className="mt-6 hidden items-center justify-between lg:flex">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1) as Step)} disabled={step === 0}>← Back</Button>
            <Button variant={step === 3 ? "accent" : "primary"} onClick={next} disabled={!canContinue && step !== 3}>{nextLabel}</Button>
          </div>
        </section>

        {/* Desktop summary */}
        <aside className="hidden lg:block">
          <Card className="sticky top-20 p-5">
            <h2 className="mb-3 text-lg font-semibold">Your stay</h2>
            {quote && checkIn && checkOut ? (
              <PriceSummary quote={quote} checkIn={checkIn} checkOut={checkOut} intraState={settings.tax.intraState} />
            ) : (
              <p className="text-sm text-muted">Pick your dates to see prices.</p>
            )}
          </Card>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-gutter pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-raised backdrop-blur lg:hidden">
        <MobileSummary quote={quote} checkIn={checkIn} checkOut={checkOut} intraState={settings.tax.intraState} />
        <div className="flex items-center gap-3">
          {step > 0 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)} aria-label="Back">←</Button>}
          <Button block variant={step === 3 ? "accent" : "primary"} onClick={next} disabled={!canContinue && step !== 3}>{nextLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function MobileSummary({ quote, checkIn, checkOut, intraState }: { quote: ReturnType<typeof computeQuote> | null; checkIn: ISODate | null; checkOut: ISODate | null; intraState: boolean }) {
  const [open, setOpen] = useState(false);
  if (!quote || !checkIn || !checkOut || quote.total === 0) {
    return checkIn && checkOut ? (
      <div className="mb-2 text-sm text-muted">{formatDate(checkIn)} → {formatDate(checkOut)}</div>
    ) : null;
  }
  return (
    <div className="mb-2">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="text-sm text-muted">Total incl. GST · <span className="text-primary">Deposit {formatINR(quote.deposit)}</span></span>
        <span className="font-semibold">{formatINR(quote.total)} <span className="text-muted">{open ? "▾" : "▴"}</span></span>
      </button>
      {open && (
        <div className="mt-3 max-h-[50vh] overflow-y-auto border-t border-border pt-3">
          <PriceSummary quote={quote} checkIn={checkIn} checkOut={checkOut} intraState={intraState} />
        </div>
      )}
    </div>
  );
}
