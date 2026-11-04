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
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(calc(-50% - var(--marquee-gap, 1rem) / 2))" } },
        "marquee-reverse": { from: { transform: "translateX(calc(-50% - var(--marquee-gap, 1rem) / 2))" }, to: { transform: "translateX(0)" } },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        aurora: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(8%, -6%) scale(1.15)" },
          "66%": { transform: "translate(-6%, 4%) scale(0.95)" },
        },
        "kenburns": { from: { transform: "scale(1.04)" }, to: { transform: "scale(1.16) translate(-1.5%, -1%)" } },
        "scroll-cue": { "0%": { transform: "translateY(0)", opacity: "0" }, "40%": { opacity: "1" }, "100%": { transform: "translateY(10px)", opacity: "0" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: {
        marquee: "marquee var(--marquee-duration, 40s) linear infinite",
        "marquee-reverse": "marquee-reverse var(--marquee-duration, 40s) linear infinite",
        "spin-slow": "spin-slow 4s linear infinite",
        aurora: "aurora 18s ease-in-out infinite",
        kenburns: "kenburns 9s ease-out forwards",
        "scroll-cue": "scroll-cue 1.8s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
