import type { Metadata, Viewport } from "next";
import "./globals.css";
import { mergeTheme, themeToCss } from "@/lib/theme";
import { getThemeOverride } from "@/lib/server/settings-repo";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: { default: "Golden Tide Retreat", template: "%s · Golden Tide Retreat" },
  description: "A six-room beachfront homestay with a coastal kitchen.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0E6E8C" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = mergeTheme(await getThemeOverride());
  return (
    <html lang="en-IN">
      <head>
        {/* Design tokens → CSS variables (src/theme/theme.config.ts + settings.theme) */}
        <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />
        {theme.fonts.stylesheetUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link rel="stylesheet" href={theme.fonts.stylesheetUrl} />
          </>
        )}
      </head>
      <body className="min-h-dvh">
        <SiteHeader />
        <main>{children}</main>
        <footer className="mt-section border-t border-border py-8 text-center text-sm text-muted">
          <div className="container-page">© {new Date().getFullYear()} Golden Tide Retreat</div>
        </footer>
      </body>
    </html>
  );
}
