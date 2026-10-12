import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";

import { siteConfig } from "@/config/site";
import { NONCE_HEADER } from "@/infrastructure/http/security-headers";
import { THEME_SCRIPT } from "@/lib/theme";
import { Providers } from "@/providers";
import "./globals.css";

const sans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});
const display = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});
const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  metadataBase: new URL(siteConfig.url),
  openGraph: { siteName: siteConfig.name, locale: "en_IN", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#141c2e" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The proxy's per-request CSP nonce. Reading headers also keeps every page dynamic, which
  // a nonce needs: a prerendered page would carry no nonce and its scripts would be blocked.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        {/* nosemgrep: nitap-dangerously-set-inner-html — a constant script of ours, no user content, run by its nonce. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
