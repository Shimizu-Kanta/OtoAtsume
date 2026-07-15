import type { Metadata } from "next";

import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AccessLogger } from "@/components/telemetry/access-logger";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oto-atsume.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "おとあつめ",
    template: "%s | おとあつめ"
  },
  description: "VTuber、配信者、歌い手などの歌ってみた動画・歌枠・ライブ歌唱記録を集めるデータベースです。",
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml"
    }
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: "おとあつめ",
    title: "おとあつめ",
    description: "VTuber、配信者、歌い手などの歌唱記録を集めるデータベースです。",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "おとあつめ"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "おとあつめ",
    description: "VTuber、配信者、歌い手などの歌唱記録を集めるデータベースです。",
    images: ["/ogp.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AccessLogger />
        <SiteHeader />
        <main className="container-page py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
