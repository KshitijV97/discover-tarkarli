# Design system

## Tokens
`src/theme/theme.config.ts` is the single source of truth:

| Group | Tokens |
|---|---|
| `colors` | background, surface, surfaceMuted, border, foreground, muted, primary (ocean), primaryForeground, primarySoft, accent (sunset orange), accentForeground, gold, success, warning, danger, veg, nonVeg |
| `fonts` | heading (Fraunces), body (Inter), stylesheetUrl (webfont CSS; empty = system fonts) |
| `radius` | sm, md, card, pill |
| `spacing` | gutter, gutterDesktop, section, maxWidth |
| `shadow` | card, raised |

## How it's wired
1. `app/layout.tsx` merges `defaultTheme` with the optional `settings.theme` row and injects `:root { --color-primary: 14 110 140; --radius-card: 1rem; … }` (`src/lib/theme.ts`).
2. `tailwind.config.ts` maps utilities to those variables: `bg-primary`, `text-muted`, `border-border`, `rounded-card`, `font-heading`, `px-gutter`, `shadow-card`, `max-w-content`. Colours are stored as RGB channels so opacity modifiers work (`bg-primary/20`).
3. Components use **only** these semantic utilities — never raw hex values or Tailwind palette colours (`bg-blue-500`).

## Changing the theme
- **In code** (versioned): edit `theme.config.ts`.
- **At runtime** (no deploy): write a partial override —
  ```sql
  insert into settings (key, value) values ('theme', '{"colors": {"primary": "#145C7A", "accent": "#F28C38"}, "radius": {"card": "0.5rem"}}')
  on conflict (key) do update set value = excluded.value;
  ```
  An admin theme editor will write this row.

## Adding a token
1. Add it to `theme.config.ts`.
2. Colours are mapped to Tailwind automatically (camelCase → kebab-case: `surfaceMuted` → `bg-surface-muted`). Radius/spacing/shadow need a line in `tailwind.config.ts`.

## UI conventions
- Mobile-first; `lg:` (≥1024px) adds sidebars. Touch targets ≥ 44px (`min-h-11`).
- Page width: `.container-page` (max-width + gutters).
- Primitives in `src/components/ui`: `Button` (primary / accent / outline / ghost), `Card`, `Field`, `Stepper`.
- Money via `formatINR()`, dates via `formatDate()` — never format inline.
