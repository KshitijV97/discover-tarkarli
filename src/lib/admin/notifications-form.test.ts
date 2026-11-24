import { describe, expect, it } from "vitest";
import { notificationsSchema } from "@/lib/notifications/config";
import { DEFAULT_TEMPLATES } from "@/lib/notifications/templates";
import { describeNotificationChanges, notificationsToForm, parseNotificationsForm, recipientField, routeField, templateField } from "./notifications-form";

const defaults = notificationsSchema.parse({});

describe("notifications editor", () => {
  it("[smoke] TC-NTF-09 the defaults round-trip through the form unchanged", () => {
    const r = parseNotificationsForm(notificationsToForm(defaults), defaults);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.templates).toEqual({}); // default wording is not stored as an override
      expect(r.value.routes["booking.confirmed"]).toEqual(defaults.routes["booking.confirmed"]);
      expect(describeNotificationChanges(defaults, r.value)).toBe("notifications: saved with no changes");
    }
  });

  it("[sanity] TC-NTF-10 normalises staff numbers and rejects bad ones with a field message", () => {
    const v = notificationsToForm(defaults);
    v[recipientField("operator", "whatsapp")] = "98200 12345\n+447700900123";
    v[recipientField("kitchen", "telegram")] = "-1001234567";
    const ok = parseNotificationsForm(v, defaults);
    expect(ok.ok && ok.value.recipients.operator.whatsapp).toEqual(["+919820012345", "+447700900123"]);
    expect(ok.ok && ok.value.recipients.kitchen.telegram).toEqual(["-1001234567"]);

    v[recipientField("operator", "sms")] = "12";
    const bad = parseNotificationsForm(v, defaults);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors[recipientField("operator", "sms")]).toMatch(/isn't a phone number/);
  });

  it("[sanity] TC-NTF-11 routes follow the ticks; edited wording is stored, default wording is not", () => {
    const v = notificationsToForm(defaults);
    delete v[routeField("booking.confirmed", "operator", "telegram")];
    v[routeField("booking.cancelled", "operator", "sms")] = "on";
    v[templateField("booking.fully_paid", "guest")] = "Thanks {{guestFirstName}}!";
    const r = parseNotificationsForm(v, defaults);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.routes["booking.confirmed"]?.operator).toEqual(["whatsapp"]);
      expect(r.value.routes["booking.cancelled"]?.operator).toEqual(["whatsapp", "sms", "telegram"]);
      expect(r.value.templates).toEqual({ "booking.fully_paid.guest": "Thanks {{guestFirstName}}!" });
      expect(describeNotificationChanges(defaults, r.value)).toBe("notifications: routes, templates changed");
    }
  });

  it("never offers Telegram to guests and keeps provider template mappings", () => {
    const current = { ...defaults, whatsappTemplates: { "booking.confirmed.guest": { name: "confirm_v1", language: "en", params: ["guestFirstName"] } } };
    const v = notificationsToForm(current);
    v[routeField("booking.confirmed", "guest", "telegram")] = "on";
    const r = parseNotificationsForm(v, current);
    expect(r.ok && r.value.routes["booking.confirmed"]?.guest).toEqual(["whatsapp"]);
    expect(r.ok && r.value.whatsappTemplates).toEqual(current.whatsappTemplates);
  });

  it("rejects bad reminder days", () => {
    const v = { ...notificationsToForm(defaults), balanceReminderDaysBefore: "1, -2" };
    expect(parseNotificationsForm(v, defaults).ok).toBe(false);
    expect(DEFAULT_TEMPLATES["booking.updated.guest"]).toContain("{{manageUrl}}");
  });
});
