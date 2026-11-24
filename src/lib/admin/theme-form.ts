/**
 * Pure: the theme editor. Colours must be #RRGGBB and the corner radius comes
 * from a fixed list, because theme values are written into the page's CSS.
 * Only values that differ from src/theme/theme.config.ts are stored.
 */
import { defaultTheme, type ThemeOverride } from "@/theme/theme.config";

type ColorKey = keyof typeof defaultTheme.colors;

export const COLOR_GROUPS: { title: string; fields: { key: ColorKey; label: string }[] }[] = [
  { title: "Brand", fields: [
    { key: "primary", label: "Main colour (buttons, links)" }, { key: "primaryForeground", label: "Text on main colour" },
    { key: "primarySoft", label: "Soft main colour (highlights)" }, { key: "accent", label: "Accent (Book a stay)" },
    { key: "accentForeground", label: "Text on accent" }, { key: "gold", label: "Gold detail" },
  ] },
  { title: "Page", fields: [
    { key: "background", label: "Page background" }, { key: "surface", label: "Cards" }, { key: "surfaceMuted", label: "Muted panels" },
    { key: "border", label: "Borders" }, { key: "foreground", label: "Text" }, { key: "muted", label: "Secondary text" },
  ] },
  { title: "Dark sections", fields: [{ key: "ink", label: "Dark background (hero, footer)" }, { key: "inkForeground", label: "Text on dark" }] },
  { title: "Status", fields: [
    { key: "success", label: "Success" }, { key: "warning", label: "Warning" }, { key: "danger", label: "Danger" },
    { key: "veg", label: "Veg tag" }, { key: "nonVeg", label: "Non-veg tag" },
  ] },
];

export const RADIUS_PRESETS = [
  { value: "0.25rem", label: "Sharp" }, { value: "0.625rem", label: "Soft" },
  { value: "1rem", label: "Rounded (default)" }, { value: "1.5rem", label: "Very rounded" },
] as const;

/** Text/background pairs that must stay readable. Below `min` saving is refused; below 4.5 it warns. */
export const CONTRAST_PAIRS: { fg: ColorKey; bg: ColorKey; label: string; min: number }[] = [
  { fg: "foreground", bg: "background", label: "Text on page background", min: 4.5 },
  { fg: "foreground", bg: "surface", label: "Text on cards", min: 4.5 },
  { fg: "muted", bg: "background", label: "Secondary text on page background", min: 3 },
  // Buttons use large bold text; below 2.5:1 is refused, below 4.5:1 warns (the default orange is 2.9:1).
  { fg: "primaryForeground", bg: "primary", label: "Button text on main colour", min: 2.5 },
  { fg: "accentForeground", bg: "accent", label: "Button text on accent", min: 2.5 },
  { fg: "inkForeground", bg: "ink", label: "Text on dark sections", min: 4.5 },
  { fg: "primary", bg: "background", label: "Links on page background", min: 3 },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (s: string) => HEX.test(s);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #RRGGBB colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}

export type ContrastCheck = { label: string; ratio: number; level: "ok" | "warn" | "fail" };

export function checkContrast(colors: Record<ColorKey, string>): ContrastCheck[] {
  return CONTRAST_PAIRS.map((p) => {
    const ratio = contrastRatio(colors[p.fg], colors[p.bg]);
    return { label: p.label, ratio, level: ratio < p.min ? "fail" : ratio < 4.5 ? "warn" : "ok" };
  });
}

export type FormValues = Record<string, string>;
export type ParseResult = { ok: true; value: ThemeOverride | null; checks: ContrastCheck[] } | { ok: false; errors: Record<string, string>; checks: ContrastCheck[] };

export function parseThemeForm(v: FormValues): ParseResult {
  const errors: Record<string, string> = {};
  const colors = { ...defaultTheme.colors } as Record<ColorKey, string>;
  for (const key of Object.keys(defaultTheme.colors) as ColorKey[]) {
    const val = (v[`color:${key}`] ?? defaultTheme.colors[key]).trim();
    if (isHex(val)) colors[key] = val.toUpperCase();
    else errors[`color:${key}`] = "Use a colour like #0E6E8C.";
  }
  const radius = v["radius:card"] ?? defaultTheme.radius.card;
  if (!RADIUS_PRESETS.some((p) => p.value === radius)) errors["radius:card"] = "Choose one of the corner styles.";

  const checks = checkContrast(colors);
  for (const c of checks) if (c.level === "fail") errors.contrast ??= `${c.label} is too hard to read (${c.ratio}:1). Pick colours with more contrast.`;
  if (Object.keys(errors).length) return { ok: false, errors, checks };

  const colorOverride: Partial<Record<ColorKey, string>> = {};
  for (const key of Object.keys(colors) as ColorKey[]) if (colors[key] !== defaultTheme.colors[key].toUpperCase()) colorOverride[key] = colors[key];
  const override: ThemeOverride = {};
  if (Object.keys(colorOverride).length) override.colors = colorOverride;
  if (radius !== defaultTheme.radius.card) override.radius = { card: radius };
  return { ok: true, value: Object.keys(override).length ? override : null, checks };
}

export function themeToForm(override: ThemeOverride | null): FormValues {
  const v: FormValues = {};
  for (const key of Object.keys(defaultTheme.colors) as ColorKey[]) {
    const val = override?.colors?.[key];
    v[`color:${key}`] = (val && isHex(val) ? val : defaultTheme.colors[key]).toUpperCase();
  }
  const r = override?.radius?.card;
  v["radius:card"] = r && RADIUS_PRESETS.some((p) => p.value === r) ? r : defaultTheme.radius.card;
  return v;
}
