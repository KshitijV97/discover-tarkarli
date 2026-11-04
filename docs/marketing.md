# Marketing content and branding

## Where the copy lives
Public copy is in `src/content/site.ts`: hero badges (`badges`), dog-friendly section (`pets`), local food page and dish list (`localFood`), and the kitchen and gallery text. Change copy there, not in components.

Room descriptions and amenities are in the database (`rooms`). "Air-conditioned" comes from the `AC` amenity on each room, so keep it there when you edit rooms.

## Branding pillars
- **Dog friendly:** hero badge, the `#pets` section on the home page, and a nav link.
- **Air-conditioned rooms:** hero badge and the rooms section. All six seeded rooms list `AC`.
- **Konkan food:** the `/food` page (modak, ghavne, shirwale, patholi, kombdi vade, surmai curry), Solkadhi as the signature drink, and a link from the kitchen section.

## Local dishes are marketing content, not menu rows
Dishes on `/food` come from `site.localFood.dishes`, not from `menu_items`. The menu table holds priced items, and no prices for these dishes are confirmed yet. When prices are confirmed, add the dishes to `menu_items` (category "Konkan") so they show in the kitchen marquee and in admin.

Dishes are made to order. There is no dish-level ordering flow yet: guests ask when they book, or call the property. A la carte ordering is on the roadmap.

## Photos folder
`/photos/` (repo root) holds the owner's own property and dog photos. It is in `.gitignore` and `.vercelignore`, so the files are neither committed nor deployed. To use them on the site, host them somewhere public (for example Supabase Storage) and point `site.ts` or `rooms.photos` at the URLs. `src/lib/images.ts` passes non-Unsplash URLs through unchanged.

## Owner to confirm before launch
- Dog policy: number of dogs per room, any extra charge, rules on beds and the restaurant. The `pets.points` copy promises only "dogs welcome in every room" and walks; confirm it.
- Dish descriptions and which dishes the kitchen can actually make on order.
- Solkadhi: confirm it is offered with meals or on request, so the "signature" wording holds.
- Replace the Unsplash placeholders with real photography (see [roadmap.md](roadmap.md)).
