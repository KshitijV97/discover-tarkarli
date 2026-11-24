import { describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/integration/harness";
import { makeRoom, NOW, guest, withoutPaymentKeys } from "@/test/integration/factories";
import { saveNotificationSettings, saveThemeOverride } from "./admin-repo";
import { getSettings, getThemeOverride } from "./settings-repo";
import { createBooking } from "./bookings";
import { notificationsToForm, parseNotificationsForm, recipientField, routeField } from "@/lib/admin/notifications-form";
import { parseThemeForm, themeToForm } from "@/lib/admin/theme-form";

const t = setupTestDb();

describe("notifications editor, end to end", () => {
  it("[sanity] TC-NTF-12 a saved staff number and route are used for the next booking", async () => {
    withoutPaymentKeys();
    const current = (await getSettings()).notifications;
    const v = notificationsToForm(current);
    v[recipientField("operator", "sms")] = "9820012345";
    v[routeField("booking.confirmed", "operator", "sms")] = "on";
    const parsed = parseNotificationsForm(v, current);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    await saveNotificationSettings(parsed.value);
    expect((await getSettings()).notifications.recipients.operator.sms).toEqual(["+919820012345"]);

    const room = await makeRoom(t.sql);
    await createBooking({ checkIn: "2027-02-01", checkOut: "2027-02-03", rooms: [{ roomId: room, guests: 2 }], meals: [], guest }, NOW);
    const rows = await t.sql<{ recipient: string }[]>`
      select recipient from notifications where event = 'booking.confirmed' and audience = 'operator' and channel = 'sms'`;
    expect(rows.map((r) => r.recipient)).toEqual(["+919820012345"]);
  });
});

describe("theme editor, end to end", () => {
  it("[sanity] TC-THM-05 saves only the changed colour, and reset removes the override", async () => {
    const parsed = parseThemeForm({ ...themeToForm(null), "color:primary": "#145A73" });
    if (!parsed.ok) throw new Error("invalid");
    await saveThemeOverride(parsed.value);
    expect(await getThemeOverride()).toEqual({ colors: { primary: "#145A73" } });
    await saveThemeOverride(null);
    expect(await getThemeOverride()).toBeNull();
  });
});

import { saveSettingsGroup } from "./admin-repo";
describe("settings save (existing editor)", () => {
  it("[smoke] TC-SET-08 a saved group is stored as JSON and read back", async () => {
    await saveSettingsGroup("deposit", { type: "percent", value: 25 });
    const [{ kind }] = await t.sql<{ kind: string }[]>`select jsonb_typeof(value) as kind from settings where key = 'deposit'`;
    expect(kind).toBe("object");
    expect((await getSettings()).deposit.value).toBe(25);
  });
});

describe("double-encoded rows from before the fix", () => {
  it("[sanity] TC-SET-09 a settings row stored as a JSON string is still read correctly", async () => {
    await t.sql`insert into settings (key, value) values ('deposit', to_jsonb('{"type":"percent","value":20}'::text))
                on conflict (key) do update set value = excluded.value`;
    expect((await getSettings()).deposit.value).toBe(20);
    await t.sql`insert into settings (key, value) values ('theme', to_jsonb('{"colors":{"primary":"#145A73"}}'::text))
                on conflict (key) do update set value = excluded.value`;
    expect(await getThemeOverride()).toEqual({ colors: { primary: "#145A73" } });
  });
});
