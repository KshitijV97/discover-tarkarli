/**
 * Image URL helper. Unsplash URLs get on-the-fly resizing params; any other
 * host (Supabase Storage, S3, R2, /public) is passed through unchanged.
 * No next/image optimisation dependency, so it works on any host.
 */
const UNSPLASH = "https://images.unsplash.com/";

export function img(src: string, w = 1200, q = 75): string {
  if (!src.startsWith(UNSPLASH)) return src;
  const u = new URL(src);
  u.searchParams.set("w", String(w));
  u.searchParams.set("q", String(q));
  u.searchParams.set("auto", "format");
  u.searchParams.set("fit", "crop");
  return u.toString();
}

export function srcSet(src: string, widths = [480, 800, 1200, 1800]): string | undefined {
  if (!src.startsWith(UNSPLASH)) return undefined;
  return widths.map((w) => `${img(src, w)} ${w}w`).join(", ");
}

/** Shorthand for an Unsplash photo id. */
export const unsplash = (id: string) => `${UNSPLASH}photo-${id}`;
