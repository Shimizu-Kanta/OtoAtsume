import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_JP, Zen_Kaku_Gothic_New } from "next/font/google";

import "./globals.css";
import { HelpButton } from "@/components/onboarding/help-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AccessLogger } from "@/components/telemetry/access-logger";
import { WatchlistWidget } from "@/components/watchlist/watchlist-widget";
import { siteUrl } from "@/lib/site-url";

// 本文: Noto Sans JP / 見出し: Zen Kaku Gothic New / 数値・日付・件数: JetBrains Mono。
// 日本語フォントは巨大なため preload せず swap で読み込む(next/font 最適化に乗せる)。
const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-sans"
});

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-heading"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-mono"
});

const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

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
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${zenKaku.variable} ${jetBrainsMono.variable}`}
    >
      <body>
        {/* async 付き script は React 19 が <head> にホイストするため、
            SSR の生 HTML に AdSense のコードスニペットがそのまま出力される */}
        {adsenseClientId ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        ) : null}
        <AccessLogger />
        <SiteHeader />
        <main className="container-page py-8">{children}</main>
        <SiteFooter />
        <WatchlistWidget />
        <HelpButton />
      </body>
    </html>
  );
}
