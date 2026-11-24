import { defaultTheme, type Theme, type ThemeOverride } from "@/theme/theme.config";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

/** "#0E6E8C" → "14 110 140" so Tailwind can apply opacity (bg-primary/20). */
export function hexToChannels(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex; // allow raw "r g b" values through
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

// Stored theme values end up inside a <style> tag, so only plain values are accepted.
const SAFE: Record<keyof Theme, RegExp> = {
  colors: /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|\d{1,3} \d{1,3} \d{1,3})$/,
  fonts: /^[\w\s'",.:/?&=%+@-]*$/,
  radius: /^\d+(\.\d+)?(rem|px|em)$/,
  spacing: /^\d+(\.\d+)?(rem|px|em)$/,
  shadow: /^[\w\s().,/%#-]*$/,
};

export function mergeTheme(override?: ThemeOverride | null): Theme {
  const base = structuredClone(defaultTheme) as unknown as Theme;
  if (!override) return base;
  for (const group of Object.keys(base) as (keyof Theme)[]) {
    const values = (override[group] ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(values)) {
      if (k in base[group] && typeof v === "string" && !/[;{}<>]/.test(v) && SAFE[group].test(v)) {
        (base[group] as Record<string, string>)[k] = v;
      }
    }
  }
  return base;
}

/** Serialises the theme to a :root { --token: value } block. */
export function themeToCss(theme: Theme): string {
  const vars: string[] = [];
  for (const [k, v] of Object.entries(theme.colors)) vars.push(`--color-${kebab(k)}: ${hexToChannels(v)};`);
  vars.push(`--font-heading: ${theme.fonts.heading};`, `--font-body: ${theme.fonts.body};`);
  for (const [k, v] of Object.entries(theme.radius)) vars.push(`--radius-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(theme.spacing)) vars.push(`--space-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(theme.shadow)) vars.push(`--shadow-${kebab(k)}: ${v};`);
  // Strip anything that could break out of the <style> tag.
  return `:root{${vars.join("")}}`.replace(/<\/?style/gi, "");
}
