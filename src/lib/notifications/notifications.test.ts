import { describe, expect, it } from "vitest";
import { defaultSettings, type AppSettings } from "@/lib/settings";
import { planDeliveries } from "./plan";
import { renderTemplate } from "./templates";
import { mealSummary } from "./context";

const settings = (patch: (s: AppSettings) => void = () => {}) => {
  const s = structuredClone(defaultSettings);
  s.notifications.recipients.operator = { whatsapp: ["+919000000001"], sms: ["+919000000001"], telegram: ["-1001"] };
  s.notifications.recipients.kitchen = { whatsapp: [], sms: [], telegram: ["-2002"] };
  patch(s);
  return s;
};
const all = () => true;

describe("templates", () => {
  it("renders vars and blanks unknown ones", () => {
    expect(renderTemplate("Hi {{ name }}, ref {{ref}}{{missing}}", { name: "Asha", ref: "GT-1" })).toBe("Hi Asha, ref GT-1");
  });
});

describe("planDeliveries", () => {
  it("routes booking.confirmed to guest WhatsApp + operator WhatsApp/Telegram", () => {
    const d = planDeliveries({ event: "booking.confirmed", vars: { guestFirstName: "Asha", reference: "GT-1" }, settings: settings(), guestPhone: "+919876543210", isConfigured: all });
    expect(d.map((x) => `${x.audience}:${x.channel}:${x.to}`)).toEqual([
      "guest:whatsapp:+919876543210",
      "operator:whatsapp:+919000000001",
      "operator:telegram:-1001",
    ]);
    expect(d[0].text).toContain("Hi Asha");
    expect(d.every((x) => !x.skipReason)).toBe(true);
  });

  it("marks unconfigured or disabled channels as skipped", () => {
    const d = planDeliveries({
      event: "payment.conflict", vars: {}, guestPhone: "+91x",
      settings: settings((s) => { s.notifications.channels.sms = false; }),
      isConfigured: (c) => c !== "telegram",
    });
    const by = Object.fromEntries(d.map((x) => [x.channel, x.skipReason]));
    expect(by.whatsapp).toBeUndefined();
    expect(by.telegram).toMatch(/not configured/);
    expect(by.sms).toMatch(/disabled/);
  });

  it("never sends Telegram to guests and honours custom routes/templates", () => {
    const d = planDeliveries({
      event: "booking.meals_updated", vars: { reference: "GT-9" }, guestPhone: "+91x", isConfigured: all,
      settings: settings((s) => {
        s.notifications.routes["booking.meals_updated"] = { guest: ["telegram", "sms"], kitchen: ["telegram"] };
        s.notifications.templates["booking.meals_updated.kitchen"] = "Meals changed {{reference}}";
      }),
    });
    expect(d.map((x) => `${x.audience}:${x.channel}`)).toEqual(["guest:sms", "kitchen:telegram"]);
    expect(d[1].text).toBe("Meals changed GT-9");
  });

  it("returns nothing when notifications are disabled", () => {
    expect(planDeliveries({ event: "booking.confirmed", vars: {}, guestPhone: "+91x", isConfigured: all, settings: settings((s) => { s.notifications.enabled = false; }) })).toEqual([]);
  });
});

describe("mealSummary", () => {
  it("summarises included and paid meals", () => {
    expect(mealSummary([
      { date: "2026-11-11", mealType: "breakfast", quantity: 2, unitPrice: 0, gstRate: 0, includedFree: true },
      { date: "2026-11-10", mealType: "dinner", quantity: 2, unitPrice: 65000, gstRate: 5, includedFree: false },
      { date: "2026-11-11", mealType: "lunch", quantity: 1, unitPrice: 55000, gstRate: 5, includedFree: false },
    ])).toBe("breakfast included, 1 lunch, 2 dinners");
  });
});
