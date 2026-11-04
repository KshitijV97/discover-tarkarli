import { describe, expect, it } from "vitest";
import { defaultSettings, type AppSettings } from "@/lib/settings";
import { mealSlots, planMeals, mealCutoff, isMealLocked } from "./meals";
import { computeQuote, computeDeposit, roomGstRate } from "./pricing";
import { normalizePhone, validateStay } from "./rules";
import { zonedTimeToUtc, todayInTz, eachDate } from "@/lib/dates";

const S = (o: Partial<{ [K in keyof AppSettings]: Partial<AppSettings[K]> }> = {}): AppSettings => {
  const s = structuredClone(defaultSettings);
  for (const k of Object.keys(o) as (keyof AppSettings)[]) Object.assign(s[k], o[k]);
  return s;
};
// 1 Nov 2026 09:00 IST — well before any cutoff for a 10 Nov stay.
const EARLY = zonedTimeToUtc("2026-11-01", "09:00", "Asia/Kolkata");

describe("dates", () => {
  it("converts IST wall clock to UTC", () => {
    expect(zonedTimeToUtc("2026-11-09", "18:00", "Asia/Kolkata").toISOString()).toBe("2026-11-09T12:30:00.000Z");
  });
  it("today in IST rolls over at IST midnight", () => {
    expect(todayInTz("Asia/Kolkata", new Date("2026-11-09T18:29:00Z"))).toBe("2026-11-09");
    expect(todayInTz("Asia/Kolkata", new Date("2026-11-09T18:31:00Z"))).toBe("2026-11-10");
  });
  it("eachDate is end-exclusive", () => {
    expect(eachDate("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
  });
});

describe("meal slots", () => {
  it("breakfast the morning after each night; lunch/dinner on each night's day", () => {
    const slots = mealSlots("2026-11-10", "2026-11-12", true);
    const of = (t: string) => slots.filter((s) => s.mealType === t).map((s) => s.date);
    expect(of("breakfast")).toEqual(["2026-11-11", "2026-11-12"]);
    expect(of("lunch")).toEqual(["2026-11-10", "2026-11-11"]);
    expect(of("dinner")).toEqual(["2026-11-10", "2026-11-11"]);
  });
});

describe("planMeals", () => {
  const base = { checkIn: "2026-11-10", checkOut: "2026-11-12", numGuests: 3, now: EARLY };

  it("auto-includes breakfast for all guests at ₹0", () => {
    const { lines, errors } = planMeals({ ...base, selections: [], settings: S() });
    expect(errors).toEqual([]);
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.mealType === "breakfast" && l.quantity === 3 && l.includedFree && l.unitPrice === 0)).toBe(true);
  });

  it("adds paid lunch/dinner headcounts at current prices", () => {
    const { lines } = planMeals({
      ...base, settings: S(),
      selections: [{ date: "2026-11-10", mealType: "dinner", quantity: 2 }, { date: "2026-11-11", mealType: "lunch", quantity: 0 }],
    });
    const dinner = lines.find((l) => l.mealType === "dinner")!;
    expect(dinner).toMatchObject({ date: "2026-11-10", quantity: 2, unitPrice: 65000, gstRate: 5, includedFree: false });
    expect(lines.filter((l) => l.mealType === "lunch")).toHaveLength(0);
  });

  it("rejects headcount above guests and invalid dates", () => {
    const { errors } = planMeals({
      ...base, settings: S(),
      selections: [{ date: "2026-11-10", mealType: "lunch", quantity: 4 }, { date: "2026-11-12", mealType: "dinner", quantity: 1 }],
    });
    expect(errors).toHaveLength(2);
  });

  it("breakfast becomes a paid choice when not included", () => {
    const { lines } = planMeals({
      ...base, settings: S({ meals: { breakfastIncluded: false } }),
      selections: [{ date: "2026-11-11", mealType: "breakfast", quantity: 2 }],
    });
    expect(lines).toEqual([expect.objectContaining({ mealType: "breakfast", quantity: 2, unitPrice: 35000, includedFree: false })]);
  });

  it("locks changes after 6pm IST the day before", () => {
    const s = S();
    expect(mealCutoff("2026-11-11", s).toISOString()).toBe("2026-11-10T12:30:00.000Z");
    const justBefore = new Date("2026-11-10T12:29:00Z");
    const justAfter = new Date("2026-11-10T12:30:00Z");
    expect(isMealLocked("2026-11-11", s, justBefore)).toBe(false);
    expect(isMealLocked("2026-11-11", s, justAfter)).toBe(true);

    const existing = [{ date: "2026-11-11", mealType: "dinner" as const, quantity: 2, unitPrice: 60000, gstRate: 5, includedFree: false }];
    const locked = planMeals({ ...base, settings: s, now: justAfter, existing, selections: [{ date: "2026-11-11", mealType: "dinner", quantity: 3 }] });
    expect(locked.errors[0]).toMatch(/cutoff/);
    expect(locked.lines.find((l) => l.mealType === "dinner")!.quantity).toBe(2);

    const admin = planMeals({ ...base, settings: s, now: justAfter, existing, enforceCutoff: false, selections: [{ date: "2026-11-11", mealType: "dinner", quantity: 3 }] });
    expect(admin.errors).toEqual([]);
    // Price snapshot preserved (₹600 at booking, even though current dinner price is ₹650).
    expect(admin.lines.find((l) => l.mealType === "dinner")).toMatchObject({ quantity: 3, unitPrice: 60000 });
  });

  it("keeps unselected existing meals unchanged", () => {
    const existing = [{ date: "2026-11-10", mealType: "lunch" as const, quantity: 1, unitPrice: 50000, gstRate: 5, includedFree: false }];
    const { lines } = planMeals({ ...base, settings: S(), existing, selections: [] });
    expect(lines.find((l) => l.mealType === "lunch")).toMatchObject({ quantity: 1, unitPrice: 50000 });
  });
});

describe("pricing", () => {
  it("applies room GST slab by tariff", () => {
    expect(roomGstRate(750000, S())).toBe(5);
    expect(roomGstRate(750100, S())).toBe(18);
  });

  it("computes totals, tax buckets and 30% deposit", () => {
    const settings = S();
    const { lines } = planMeals({
      checkIn: "2026-11-10", checkOut: "2026-11-12", numGuests: 2, now: EARLY, settings,
      selections: [{ date: "2026-11-10", mealType: "dinner", quantity: 2 }],
    });
    const q = computeQuote({
      checkIn: "2026-11-10", checkOut: "2026-11-12", settings, meals: lines,
      rooms: [{ roomId: "r1", name: "Sunset", guests: 2, pricePerNight: 520000, gstRate: 5 }],
    });
    expect(q.nights).toBe(2);
    expect(q.roomSubtotal).toBe(1040000); // ₹10,400
    expect(q.mealSubtotal).toBe(130000); // 2 × ₹650
    expect(q.tax).toBe(52000 + 6500);
    expect(q.total).toBe(1170000 + 58500); // ₹12,285
    expect(q.taxBreakdown).toEqual([{ rate: 5, taxable: 1170000, tax: 58500 }]);
    expect(q.deposit).toBe(368600); // 30% of ₹12,285 = ₹3,685.50 → rounded up to ₹3,686
    expect(q.balance).toBe(q.total - q.deposit);
  });

  it("fixed deposit never exceeds total", () => {
    expect(computeDeposit(100000, S({ deposit: { type: "fixed", value: 2000 } }))).toBe(100000);
    expect(computeDeposit(500000, S({ deposit: { type: "fixed", value: 2000 } }))).toBe(200000);
  });
});

describe("rules", () => {
  const now = new Date("2026-11-04T06:00:00Z");
  it("validates stay window", () => {
    expect(validateStay("2026-11-10", "2026-11-12", S(), now)).toBeNull();
    expect(validateStay("2026-11-03", "2026-11-05", S(), now)).toMatch(/past/);
    expect(validateStay("2026-11-10", "2026-11-10", S(), now)).toMatch(/after/);
    expect(validateStay("2026-11-10", "2026-12-20", S(), now)).toMatch(/Maximum/);
  });
  it("normalises phones", () => {
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
    expect(normalizePhone("12345")).toBeNull();
  });
});
