import type { Config } from "tailwindcss";
import { defaultTheme } from "./src/theme/theme.config";

// Every colour/radius/font/spacing utility resolves to a CSS variable defined
// from src/theme/theme.config.ts — change the theme there, not here.
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const colors = Object.fromEntries(
  Object.keys(defaultTheme.colors).map((k) => [kebab(k), `rgb(var(--color-${kebab(k)}) / <alpha-value>)`]),
);

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors,
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      spacing: {
        gutter: "var(--space-gutter)",
        "gutter-desktop": "var(--space-gutter-desktop)",
        section: "var(--space-section)",
      },
      maxWidth: { content: "var(--space-max-width)" },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
      },
    },
  },
  plugins: [],
};
export default config;
