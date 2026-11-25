import { ImageResponse } from "next/og";
import { brand } from "@/content/brand";
import { shareImage } from "@/lib/seo";
import { defaultTheme } from "@/theme/theme.config";

/**
 * Link-preview image (1200×630), rendered once at build time with the
 * built-in next/og renderer. Drawn from theme tokens (no stock photo is
 * stored in the repo): a sunrise over the sea with the site name on top.
 */
export const alt = shareImage.alt;
export const size = { width: shareImage.width, height: shareImage.height };
export const contentType = "image/png";

const c = defaultTheme.colors;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden",
        background: `linear-gradient(180deg, ${c.ink} 0%, ${c.primary} 55%, ${c.accent} 100%)` }}>
        {/* Sun on the horizon */}
        <div style={{ position: "absolute", left: 760, top: 300, width: 300, height: 300, borderRadius: 9999,
          background: `radial-gradient(circle, ${c.gold} 0%, ${c.accent} 70%)`, opacity: 0.95 }} />
        {/* Sea */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 450, bottom: 0, display: "flex",
          background: `linear-gradient(180deg, ${c.primary} 0%, ${c.ink} 100%)` }} />
        {[470, 505, 545, 590].map((top, i) => (
          <div key={top} style={{ position: "absolute", left: 700 + i * 20, top, width: 420 - i * 40, height: 6,
            borderRadius: 9999, background: c.gold, opacity: 0.55 - i * 0.1 }} />
        ))}
        {/* Text */}
        <div style={{ position: "absolute", left: 80, top: 0, bottom: 0, width: 680, display: "flex",
          flexDirection: "column", justifyContent: "center", color: c.inkForeground }}>
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: c.gold }}>
            {brand.region}
          </div>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05, marginTop: 18 }}>{brand.name}</div>
          <div style={{ fontSize: 32, marginTop: 24, opacity: 0.9 }}>{brand.shareTagline}</div>
        </div>
      </div>
    ),
    size,
  );
}
