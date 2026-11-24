import type { Metadata } from "next";
import { brand } from "@/content/brand";

/** Share image served by src/app/opengraph-image.tsx. */
export const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${brand.name}: ${brand.shareTagline}`,
} as const;

/** Site-wide defaults for the root layout. Pages add their own via `pageMetadata`. */
export const rootMetadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  openGraph: {
    type: "website",
    siteName: brand.name,
    locale: brand.locale,
    title: brand.name,
    description: brand.description,
    url: "/",
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: brand.name,
    description: brand.description,
    images: [{ url: shareImage.url, alt: shareImage.alt }],
  },
};

/**
 * Title, description, canonical URL and matching link-preview tags for a
 * public page. `title` omitted = the plain site name (home page).
 */
export function pageMetadata({ title, description, path }: { title?: string; description: string; path: string }): Metadata {
  const fullTitle = title ? `${title} · ${brand.name}` : brand.name;
  return {
    title: title ?? { absolute: brand.name },
    description,
    alternates: { canonical: path },
    openGraph: { ...rootMetadata.openGraph, title: fullTitle, description, url: path },
    twitter: { ...rootMetadata.twitter, title: fullTitle, description },
  };
}
