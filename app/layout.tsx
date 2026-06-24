import type { Metadata } from "next";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: {
    default: "うたあつめ",
    template: "%s | うたあつめ"
  },
  description: "歌ってみた、歌枠、ライブ等の歌唱記録を集めるデータベース"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <SiteHeader />
        <main className="container-page py-8">{children}</main>
      </body>
    </html>
  );
}
