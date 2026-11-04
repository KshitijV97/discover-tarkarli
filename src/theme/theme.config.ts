/**
 * Golden Tide design tokens — the single source of truth for the look & feel.
 *
 * - Edit values here to restyle the whole app.
 * - At runtime, a `theme` row in the `settings` table (a partial of this
 *   object) is deep-merged on top, so the theme can be changed without a
 *   redeploy (an admin theme editor will write to that row later).
 * - Tokens are emitted as CSS variables on :root (see src/lib/theme.ts) and
 *   Tailwind utilities (bg-primary, rounded-card, font-heading, p-gutter…)
 *   point at those variables — components never hardcode colours.
 */
export const defaultTheme = {
  colors: {
    // Surfaces
    background: "#FBF6EE", // warm sand
    surface: "#FFFFFF",
    surfaceMuted: "#F3EADB", // deeper sand
    border: "#E6D8C3",
    // Text
    foreground: "#1F2A33",
    muted: "#6B7780",
    // Brand
    primary: "#0E6E8C", // ocean blue
    primaryForeground: "#FFFFFF",
    primarySoft: "#DCEFF4",
    accent: "#E8793A", // sunset orange
    accentForeground: "#FFFFFF",
    gold: "#D9A441", // sunset gold
    // Deep sea, for dark sections, overlays and the hero
    ink: "#0A1C26",
    inkForeground: "#F5EFE4",
    // Feedback
    success: "#2E8B57",
    warning: "#C98A12",
    danger: "#C2412D",
    // Food tags
    veg: "#2E8B57",
    nonVeg: "#B23A2B",
  },
  fonts: {
    heading: "'Fraunces', Georgia, serif",
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    /** Stylesheet URL for webfonts (Google Fonts or self-hosted). Empty = system fonts only. */
    stylesheetUrl:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
  },
  radius: {
    sm: "0.375rem",
    md: "0.625rem",
    card: "1rem",
    pill: "9999px",
  },
  spacing: {
    gutter: "1rem", // page side padding on mobile
    gutterDesktop: "2rem",
    section: "2.5rem", // vertical rhythm between sections
    maxWidth: "72rem", // content width on desktop
  },
  shadow: {
    card: "0 1px 2px rgb(31 42 51 / 0.06), 0 4px 16px rgb(31 42 51 / 0.06)",
    raised: "0 8px 30px rgb(31 42 51 / 0.12)",
  },
} as const;

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Theme = Widen<typeof defaultTheme>;
export type ThemeOverride = { [K in keyof Theme]?: Partial<Theme[K]> };
