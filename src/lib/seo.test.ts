import { describe, expect, it } from "vitest";
import { brand } from "@/content/brand";
import { pageMetadata, rootMetadata, shareImage } from "./seo";

describe("link-preview metadata", () => {
  it("[smoke] root metadata has an absolute base, Open Graph and a large Twitter card", () => {
    expect(String(rootMetadata.metadataBase)).toBe(`${brand.url}/`);
    expect(rootMetadata.openGraph).toMatchObject({ siteName: brand.name, type: "website", images: [shareImage] });
    expect(rootMetadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(shareImage).toMatchObject({ width: 1200, height: 630 });
  });

  it("gives each page its own title, description and canonical URL", () => {
    const m = pageMetadata({ title: "Book your stay", description: "Book it.", path: "/book" });
    expect(m.title).toBe("Book your stay");
    expect(m.alternates?.canonical).toBe("/book");
    expect(m.openGraph).toMatchObject({ title: `Book your stay · ${brand.name}`, description: "Book it.", url: "/book", images: [shareImage] });
    expect(m.twitter).toMatchObject({ title: `Book your stay · ${brand.name}`, description: "Book it.", card: "summary_large_image" });
  });

  it("uses the bare site name for the home page", () => {
    const m = pageMetadata({ description: brand.description, path: "/" });
    expect(m.title).toEqual({ absolute: brand.name });
    expect(m.openGraph).toMatchObject({ title: brand.name });
  });
});
