import type { Metadata } from "next";

import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AccessLogger } from "@/components/telemetry/access-logger";

export const metadata: Metadata = {
  title: {
    default: "おとあつめ",
    template: "%s | おとあつめ"
  },
  description: "歌唱記録を集めるデータベース"
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
