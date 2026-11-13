import { describe, expect, it } from "vitest";
import { changedFields, describeChanges } from "./diff";

describe("settings change diff", () => {
  it("[sanity] TC-SET-07 records only the fields that changed, readable in the log", () => {
    const changes = changedFields({ type: "percent", value: 30 }, { type: "percent", value: 25 });
    expect(changes).toEqual([{ field: "value", from: 30, to: 25 }]);
    expect(describeChanges("deposit", changes)).toBe("deposit.value: 30 → 25");
  });
  it("says so when nothing changed", () => {
    expect(describeChanges("tax", changedFields({ foodRate: 5 }, { foodRate: 5 }))).toBe("tax: saved with no changes");
  });
});
