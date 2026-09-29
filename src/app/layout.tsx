import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import Script from "next/script";
import { copy } from "@/content/site";
import { themeScript } from "@/features/shell/theme-script";
import "./globals.css";

const sans = Google_Sans({ subsets: ["latin"], variable: "--font-google-sans", display: "swap" });
const mono = Google_Sans_Code({ subsets: ["latin"], variable: "--font-google-sans-code", display: "swap" });

export const metadata: Metadata = {
  title: { default: copy.appName, template: `%s · ${copy.appName}` },
  description: copy.description,
};

/**
 * The true root layout: html/head/body only. No sidebar, no search dialog,
 * no workspace read. Signed-out routes (/login, /auth/*) render inside this
 * and nothing else, so a visitor who has not signed in never sees document
 * titles or any other workspace content.
 *
 * The app shell (sidebar, search, the auth-gated pages) lives one level
 * down, in app/(app)/layout.tsx.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme before
    // React hydrates, which is intended and would otherwise warn.
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* beforeInteractive puts this in the server HTML ahead of any app
            code, so a saved theme applies before first paint. A raw <script>
            here works too, but React 19 flags it on client renders. */}
        <Script id="crisp-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
