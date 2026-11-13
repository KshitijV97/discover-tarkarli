"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/server/session";
import { BookingError } from "@/lib/server/bookings";
import { applyStaffAction, recordManualPayment, saveBookingNotes } from "@/lib/server/admin-bookings";
import { resendNotification } from "@/lib/server/notify";
import { writeAudit } from "@/lib/server/audit-repo";
import { MANUAL_METHODS, parseRupeesInput, type ManualMethod, type StaffAction } from "@/lib/admin/booking-ops";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const ACTIONS: StaffAction[] = ["check_in", "check_out", "cancel"];

async function run(bookingId: string, fn: () => Promise<string>): Promise<ActionResult> {
  try {
    const message = await fn();
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    return { ok: true, message };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, message: err.message };
    console.error("[admin] booking action failed", err);
    return { ok: false, message: "Something went wrong. Nothing was changed; please try again." };
  }
}

export async function staffActionAction(bookingId: string, action: string): Promise<ActionResult> {
  const user = await requireStaff(`/admin/bookings/${bookingId}`);
  if (!ACTIONS.includes(action as StaffAction)) return { ok: false, message: "Unknown action." };
  return run(bookingId, async () => {
    await applyStaffAction(bookingId, action as StaffAction, user.email ?? user.id);
    return { check_in: "Checked in.", check_out: "Checked out.", cancel: "Booking cancelled. The rooms are free again." }[action as StaffAction];
  });
}

export async function recordPaymentAction(bookingId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireStaff(`/admin/bookings/${bookingId}`);
  const amount = parseRupeesInput(String(formData.get("amount") ?? ""));
  const method = String(formData.get("method") ?? "");
  if (amount === null) return { ok: false, message: "Enter the amount in rupees, for example 2500." };
  if (!(MANUAL_METHODS as readonly string[]).includes(method)) return { ok: false, message: "Choose how the guest paid." };
  return run(bookingId, async () => {
    const s = await recordManualPayment(bookingId, { amount, method: method as ManualMethod, note: String(formData.get("note") ?? "") }, user.email ?? user.id);
    return s.balance === 0 ? "Payment recorded. The booking is fully paid." : "Payment recorded.";
  });
}

export async function saveNotesAction(bookingId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireStaff(`/admin/bookings/${bookingId}`);
  return run(bookingId, async () => {
    await saveBookingNotes(bookingId, String(formData.get("notes") ?? ""), user.email ?? user.id);
    return "Notes saved.";
  });
}

export async function resendAction(notificationId: string, bookingId: string | null): Promise<ActionResult> {
  const user = await requireStaff("/admin/notifications");
  try {
    const res = await resendNotification(notificationId);
    await writeAudit({ actorEmail: user.email ?? user.id, action: "notification.resend", entity: "notification", entityId: notificationId, detail: { result: res.status } });
    if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/notifications");
    return res.status === "sent" ? { ok: true, message: "Sent." } : { ok: false, message: res.error ?? `Not sent (${res.status}).` };
  } catch (err) {
    console.error("[admin] resend failed", err);
    return { ok: false, message: "Couldn't resend. Please try again." };
  }
}
