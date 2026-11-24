import { describe, expect, it } from "vitest";
import { paidFlags, parseRupeesInput, paymentSummary, staffActions, validateManualPayment } from "./booking-ops";

const stay = { checkIn: "2027-02-10", checkOut: "2027-02-12" };
const allowed = (status: Parameters<typeof staffActions>[0]["status"], today: string) =>
  staffActions({ status, ...stay }, today).filter((a) => a.allowed).map((a) => a.action);

describe("staff actions", () => {
  it("[smoke] TC-ADM2-01 confirmed booking on arrival day can be checked in or cancelled", () => {
    expect(allowed("confirmed", "2027-02-10")).toEqual(["check_in", "cancel"]);
  });
  it("[sanity] TC-ADM2-02 check-in is blocked before the arrival date and after the stay", () => {
    const early = staffActions({ status: "confirmed", ...stay }, "2027-02-09").find((a) => a.action === "check_in")!;
    expect(early.allowed).toBe(false);
    expect(early.reason).toMatch(/opens on/);
    expect(allowed("confirmed", "2027-02-12")).toEqual(["cancel"]);
  });
  it("a hold must be paid before check-in; checked-in guests can only check out", () => {
    expect(allowed("pending", "2027-02-10")).toEqual(["cancel"]);
    expect(allowed("checked_in", "2027-02-11")).toEqual(["check_out"]);
  });
  it("finished, cancelled and expired bookings allow nothing", () => {
    for (const s of ["checked_out", "cancelled", "expired"] as const) expect(allowed(s, "2027-02-10")).toEqual([]);
  });
});

describe("payments ledger", () => {
  it("[smoke] TC-ADM2-03 balance is the total minus paid entries; failed and pending orders don't count", () => {
    const s = paymentSummary(1365000, [
      { amount: 409500, status: "paid" }, { amount: 409500, status: "created" }, { amount: 100, status: "failed" },
    ]);
    expect(s).toEqual({ total: 1365000, paid: 409500, balance: 955500, refundDue: 0 });
  });
  it("conflict payments are refunds due, not payments", () => {
    expect(paymentSummary(100000, [{ amount: 30000, status: "conflict" }])).toMatchObject({ paid: 0, balance: 100000, refundDue: 30000 });
  });
  it("flags deposit and full payment", () => {
    expect(paidFlags(paymentSummary(100000, [{ amount: 30000, status: "paid" }]), 30000)).toEqual({ depositPaid: true, fullyPaid: false });
    expect(paidFlags(paymentSummary(100000, [{ amount: 100000, status: "paid" }]), 30000)).toEqual({ depositPaid: true, fullyPaid: true });
  });
});

describe("manual payment validation", () => {
  const due = paymentSummary(100000, [{ amount: 30000, status: "paid" }]); // ₹700 due
  it("[sanity] TC-ADM2-04 rejects overpayment, zero, unknown methods and closed bookings", () => {
    expect(validateManualPayment({ status: "confirmed" }, due, { amount: 70000, method: "cash" })).toBeNull();
    expect(validateManualPayment({ status: "confirmed" }, due, { amount: 70001, method: "cash" })).toMatch(/more than/);
    expect(validateManualPayment({ status: "confirmed" }, due, { amount: 0, method: "upi" })).toMatch(/above/);
    expect(validateManualPayment({ status: "confirmed" }, due, { amount: 100, method: "cheque" })).toMatch(/how the guest paid/);
    expect(validateManualPayment({ status: "cancelled" }, due, { amount: 100, method: "cash" })).toMatch(/cancelled/);
  });
  it("parses typed rupee amounts", () => {
    expect(parseRupeesInput("2,500")).toBe(250000);
    expect(parseRupeesInput("₹ 99.5")).toBe(9950);
    expect(parseRupeesInput("12.345")).toBeNull();
    expect(parseRupeesInput("abc")).toBeNull();
  });
});

import { defaultSettings } from "@/lib/settings";
import { carryOverMeals, validateStayChange } from "./booking-ops";

describe("changing a stay", () => {
  const S = defaultSettings;
  it("[sanity] TC-ADM2-17 upcoming bookings can move to any valid future dates", () => {
    expect(validateStayChange({ status: "confirmed", checkIn: "2027-02-10" }, { checkIn: "2027-02-20", checkOut: "2027-02-22" }, "2027-02-01", S)).toBeNull();
    expect(validateStayChange({ status: "confirmed", checkIn: "2027-02-10" }, { checkIn: "2027-01-20", checkOut: "2027-01-22" }, "2027-02-01", S)).toMatch(/past/);
    expect(validateStayChange({ status: "pending", checkIn: "2027-02-10" }, { checkIn: "2027-02-10", checkOut: "2027-02-10" }, "2027-02-01", S)).toMatch(/after check-in/);
  });
  it("[sanity] TC-ADM2-18 an in-house guest can extend but not change the arrival date", () => {
    const inHouse = { status: "checked_in" as const, checkIn: "2027-02-10" };
    expect(validateStayChange(inHouse, { checkIn: "2027-02-10", checkOut: "2027-02-14" }, "2027-02-11", S)).toBeNull();
    expect(validateStayChange(inHouse, { checkIn: "2027-02-11", checkOut: "2027-02-14" }, "2027-02-11", S)).toMatch(/already arrived/);
    expect(validateStayChange(inHouse, { checkIn: "2027-02-10", checkOut: "2027-02-11" }, "2027-02-11", S)).toMatch(/after today/);
  });
  it("finished and cancelled bookings can't be changed", () => {
    for (const status of ["checked_out", "cancelled", "expired"] as const)
      expect(validateStayChange({ status, checkIn: "2027-02-10" }, { checkIn: "2027-02-20", checkOut: "2027-02-22" }, "2027-02-01", S)).toMatch(/can't be changed/);
  });
  it("carries meal choices to the new dates, caps headcount and drops what no longer fits", () => {
    const line = (date: string, mealType: "lunch" | "dinner" | "breakfast", quantity: number, includedFree = false) =>
      ({ date, mealType, quantity, unitPrice: 65000, gstRate: 5, includedFree });
    const kept = carryOverMeals(
      [line("2027-02-10", "dinner", 3), line("2027-02-11", "lunch", 2), line("2027-02-11", "breakfast", 3, true)],
      { checkIn: "2027-02-10", checkOut: "2027-02-11", numGuests: 2 }, S,
    );
    expect(kept).toEqual([{ date: "2027-02-10", mealType: "dinner", quantity: 2 }]);
  });
});
