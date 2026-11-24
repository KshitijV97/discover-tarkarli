import { describe, expect, it } from "vitest";
import { defaultTheme } from "@/theme/theme.config";
import { mergeTheme, themeToCss } from "@/lib/theme";
import { contrastRatio, parseThemeForm, themeToForm } from "./theme-form";

describe("theme editor", () => {
  it("[smoke] TC-THM-01 the default theme round-trips and stores nothing", () => {
    const r = parseThemeForm(themeToForm(null));
    expect(r.ok && r.value).toBeNull();
    expect(r.checks.every((c) => c.level !== "fail")).toBe(true);
  });

  it("[sanity] TC-THM-02 stores only changed values", () => {
    const v = { ...themeToForm(null), "color:primary": "#145a73", "radius:card": "0.625rem" };
    const r = parseThemeForm(v);
    expect(r.ok && r.value).toEqual({ colors: { primary: "#145A73" }, radius: { card: "0.625rem" } });
  });

  it("[sanity] TC-THM-03 rejects anything that isn't a hex colour or a listed radius (no CSS injection)", () => {
    const r = parseThemeForm({ ...themeToForm(null), "color:primary": "red;}body{display:none", "radius:card": "1px;}*{x:y" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["color:primary", "radius:card"]);
  });

  it("[sanity] TC-THM-04 refuses unreadable text and computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    const r = parseThemeForm({ ...themeToForm(null), "color:foreground": "#F5F5F5" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.contrast).toMatch(/hard to read/);
  });

  it("the theme loader ignores unsafe values already in the database", () => {
    const t = mergeTheme({ colors: { primary: "red;}body{display:none" }, radius: { card: "1px;}*{x:y" } } as never);
    expect(t.colors.primary).toBe(defaultTheme.colors.primary);
    expect(t.radius.card).toBe(defaultTheme.radius.card);
    expect(themeToCss(t)).not.toContain("display:none");
  });
});
