import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_JP, Zen_Kaku_Gothic_New } from "next/font/google";

import "./globals.css";
import { GA_INIT_SCRIPT, GA_MEASUREMENT_ID } from "@/lib/analytics";
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
      {process.env.NODE_ENV === "production" ? (
        <head>
          {/* 初期化（オプトアウト判定 → config）を gtag.js 本体より前に置き、HTML のパース時点で実行させる。
              gtag.js は async なのでページ表示を妨げない（AdSense と同じく SSR の生 HTML に出す）。
              next/script はハイドレーション後の実行になり、早期離脱の訪問を取りこぼすため使わない。 */}
          <script id="ga-init" dangerouslySetInnerHTML={{ __html: GA_INIT_SCRIPT }} />
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        </head>
      ) : null}
      <body>{children}</body>
    </html>
  );
}
