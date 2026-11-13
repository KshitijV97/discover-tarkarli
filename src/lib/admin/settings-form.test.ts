import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/lib/settings";
import { SETTINGS_GROUPS, groupToFormValues, parseGroupForm, type SettingsGroupDef } from "./settings-form";

const group = (key: SettingsGroupDef["key"]) => SETTINGS_GROUPS.find((g) => g.key === key)!;

describe("groupToFormValues", () => {
  it("prefills every field of a group from settings", () => {
    const values = groupToFormValues(defaultSettings, "deposit");
    expect(values).toEqual({ type: "percent", value: "30" });
  });

  it("maps booleans to on / empty", () => {
    const values = groupToFormValues(defaultSettings, "tax");
    expect(values.intraState).toBe("on");
  });
});

describe("parseGroupForm", () => {
  it("[smoke] round-trips the defaults without errors", () => {
    for (const g of SETTINGS_GROUPS) {
      const result = parseGroupForm(g, groupToFormValues(defaultSettings, g.key));
      expect(result.ok, g.key).toBe(true);
    }
  });

  it("treats an unticked checkbox as false", () => {
    const result = parseGroupForm(group("tax"), { ...groupToFormValues(defaultSettings, "tax"), intraState: "" });
    expect(result).toEqual({ ok: true, value: expect.objectContaining({ intraState: false }) });
  });

  it("converts numeric strings to numbers", () => {
    const result = parseGroupForm(group("deposit"), { type: "fixed", value: "2500" });
    expect(result).toEqual({ ok: true, value: { type: "fixed", value: 2500 } });
  });

  it("[sanity] TC-SET-02 reports per-field errors for invalid input", () => {
    const result = parseGroupForm(group("deposit"), { type: "percent", value: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty("value");
  });

  it("rejects a bad time format", () => {
    const result = parseGroupForm(group("booking"), { ...groupToFormValues(defaultSettings, "booking"), checkInTime: "2pm" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.checkInTime).toBeTruthy();
  });

  it("rejects an unknown deposit type", () => {
    const result = parseGroupForm(group("deposit"), { type: "bogus", value: "10" });
    expect(result.ok).toBe(false);
  });

  it("rejects negative prices", () => {
    const result = parseGroupForm(group("meals"), { ...groupToFormValues(defaultSettings, "meals"), lunchPrice: "-5" });
    expect(result.ok).toBe(false);
  });
});
