import { describe, expect, it, beforeEach } from "vitest";
import { setupTestDb } from "@/test/integration/harness";
import { makeRoom, setSetting, NOW, guest, withFakePaymentKeys, withoutPaymentKeys } from "@/test/integration/factories";
import { createBooking } from "./bookings";
import { applyStaffAction, getAdminBooking, recordManualPayment } from "./admin-bookings";
import { getAvailableRoomIds } from "./rooms-repo";
import { resendNotification } from "./notify";

const t = setupTestDb();
const STAFF = "staff@example.com";
beforeEach(() => withoutPaymentKeys());

// Stay starts on NOW's date (10 Jan 2027), so check-in is open.
async function booking(o: { pending?: boolean; checkIn?: string; checkOut?: string } = {}) {
  if (o.pending) withFakePaymentKeys();
  const room = await makeRoom(t.sql, { priceRupees: 6500 });
  const { reference } = await createBooking({
    checkIn: o.checkIn ?? "2027-01-10", checkOut: o.checkOut ?? "2027-01-12", rooms: [{ roomId: room, guests: 2 }], meals: [], guest,
  }, NOW);
  withoutPaymentKeys();
  const [b] = await t.sql<{ id: string }[]>`select id from bookings where reference = ${reference}`;
  return { id: b.id, room };
}
const status = async (id: string) => (await t.sql<{ status: string }[]>`select status from bookings where id = ${id}`)[0].status;

describe("staff status actions", () => {
  it("[sanity] TC-ADM2-05 check in then check out, each written to the audit log", async () => {
    const { id } = await booking();
    await applyStaffAction(id, "check_in", STAFF, NOW);
    expect(await status(id)).toBe("checked_in");
    await applyStaffAction(id, "check_out", STAFF, NOW);
    expect(await status(id)).toBe("checked_out");
    const audit = await t.sql<{ action: string; actor_email: string }[]>`select action, actor_email from admin_audit_log order by created_at`;
    expect(audit).toEqual([
      { action: "booking.check_in", actor_email: STAFF },
      { action: "booking.check_out", actor_email: STAFF },
    ]);
  });

  it("refuses an action the rules don't allow, and changes nothing", async () => {
    const { id } = await booking({ checkIn: "2027-01-20", checkOut: "2027-01-22" });
    await expect(applyStaffAction(id, "check_in", STAFF, NOW)).rejects.toMatchObject({ code: "LOCKED" });
    await expect(applyStaffAction(id, "check_out", STAFF, NOW)).rejects.toMatchObject({ code: "LOCKED" });
    expect(await status(id)).toBe("confirmed");
    expect((await t.sql`select 1 from admin_audit_log`).length).toBe(0);
  });

  it("[sanity] TC-ADM2-06 cancelling frees the room, notes a refund if the deposit was paid, and notifies once", async () => {
    await setSetting(t.sql, "notifications", { recipients: { operator: { whatsapp: ["+919800000000"] } } });
    const { id, room } = await booking();
    await recordManualPayment(id, { amount: 409500, method: "upi" }, STAFF); // deposit paid at the desk
    await applyStaffAction(id, "cancel", STAFF, NOW);
    expect(await status(id)).toBe("cancelled");
    expect(await getAvailableRoomIds("2027-01-10", "2027-01-12")).toContain(room);
    const [{ notes }] = await t.sql<{ notes: string }[]>`select notes from bookings where id = ${id}`;
    expect(notes).toMatch(/refund/);
    await expect(applyStaffAction(id, "cancel", STAFF, NOW)).rejects.toMatchObject({ code: "LOCKED" });
    const sent = await t.sql`select 1 from notifications where event = 'booking.cancelled' and audience = 'operator'`;
    expect(sent.length).toBe(1);
  });
});

describe("manual payments", () => {
  it("[smoke] TC-ADM2-07 part payment leaves a balance; paying the rest marks the booking fully paid", async () => {
    const { id } = await booking(); // ₹13,650 total
    let s = await recordManualPayment(id, { amount: 500000, method: "cash", note: "at check-in" }, STAFF);
    expect(s.balance).toBe(865000);
    let flags = (await t.sql<{ deposit_paid: boolean; balance_paid: boolean }[]>`select deposit_paid, balance_paid from bookings where id = ${id}`)[0];
    expect(flags).toEqual({ deposit_paid: true, balance_paid: false });

    s = await recordManualPayment(id, { amount: 865000, method: "upi" }, STAFF);
    expect(s.balance).toBe(0);
    flags = (await t.sql<{ deposit_paid: boolean; balance_paid: boolean }[]>`select deposit_paid, balance_paid from bookings where id = ${id}`)[0];
    expect(flags).toEqual({ deposit_paid: true, balance_paid: true });

    const detail = await getAdminBooking(id);
    expect(detail!.payments.map((p) => [p.kind, p.provider, p.method, p.recordedBy])).toEqual([
      ["deposit", "manual", "cash", STAFF], ["balance", "manual", "upi", STAFF],
    ]);
    expect(detail!.payments[0].note).toBe("at check-in");
    await expect(recordManualPayment(id, { amount: 100, method: "cash" }, STAFF)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("[sanity] TC-ADM2-08 a hold paid at the desk becomes confirmed", async () => {
    const { id } = await booking({ pending: true });
    expect(await status(id)).toBe("pending");
    await recordManualPayment(id, { amount: 409500, method: "card" }, STAFF);
    expect(await status(id)).toBe("confirmed");
    const [{ expires_at }] = await t.sql<{ expires_at: Date | null }[]>`select expires_at from bookings where id = ${id}`;
    expect(expires_at).toBeNull();
  });

  it("[sanity] TC-ADM2-09 two staff recording the full balance at the same moment: only one is accepted", async () => {
    const { id } = await booking();
    const results = await Promise.allSettled([
      recordManualPayment(id, { amount: 1365000, method: "cash" }, "a@example.com"),
      recordManualPayment(id, { amount: 1365000, method: "upi" }, "b@example.com"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [{ n }] = await t.sql<{ n: number }[]>`select count(*)::int as n from payments where booking_id = ${id} and status = 'paid'`;
    expect(n).toBe(1);
  });
});

describe("notification resend", () => {
  it("[sanity] TC-ADM2-10 resending on a channel that isn't set up reports it and sends nothing", async () => {
    const { id } = await booking();
    const [row] = await t.sql<{ id: string }[]>`select id from notifications where booking_id = ${id} limit 1`;
    const res = await resendNotification(row.id);
    expect(res.status).toBe("skipped");
    expect(res.error).toMatch(/isn't set up/);
  });
});
