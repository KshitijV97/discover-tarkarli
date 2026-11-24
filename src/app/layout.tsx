import type { Metadata, Viewport } from "next";
import "./globals.css";
import { mergeTheme, themeToCss } from "@/lib/theme";
import { getSettings, getThemeOverride } from "@/lib/server/settings-repo";
import { defaultSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/server/session";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MotionProvider } from "@/components/fx/MotionProvider";
import { rootMetadata } from "@/lib/seo";

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0E6E8C" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [override, user, settings] = await Promise.all([
    getThemeOverride(),
    getSessionUser(),
    getSettings().catch(() => defaultSettings),
  ]);
  const theme = mergeTheme(override);
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
      <body className="flex min-h-dvh flex-col">
        <MotionProvider>
          <Header user={user} />
          <main className="flex-1">{children}</main>
          <Footer property={settings.property} />
        </MotionProvider>
      </body>
    </html>
  );
}
