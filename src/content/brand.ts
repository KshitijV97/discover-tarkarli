/**
 * Public brand identity: the one place for the site name, tagline and
 * production URL used in page titles, link previews and the share image.
 * When the site moves to the Discover Tarkarli name or domain, change it here.
 */
export const brand = {
  /** The name visitors see in titles and link previews. */
  name: "Golden Tide Retreat",
  /** One-line summary for search results and link previews. */
  description:
    "A six-room, dog-friendly beachfront homestay on the Tarkarli coast, with a Konkan kitchen and breakfast included every morning.",
  /** Small eyebrow above the name on the share image. */
  region: "Tarkarli · Malvan",
  /** Short line shown under the name on the share image. */
  shareTagline: "Beachfront homestay on the Konkan coast",
  /** Production origin. Link previews need absolute URLs, so this is fixed rather than read from env. */
  url: "https://golden-tide-retreat.vercel.app",
  locale: "en_IN",
} as const;
