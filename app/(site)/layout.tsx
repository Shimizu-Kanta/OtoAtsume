import { BasketBar } from "@/components/basket/basket-bar";
import { MiniPlayer } from "@/components/basket/mini-player";
import { BasketRail } from "@/components/basket/basket-rail";
import { HelpButton } from "@/components/onboarding/help-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AccessLogger } from "@/components/telemetry/access-logger";
import { WatchlistWidget } from "@/components/watchlist/watchlist-widget";
import { BasketProvider } from "@/lib/basket/context";
import { PreviewProvider } from "@/lib/basket/preview-context";

const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

// 公開サイトの外枠。管理画面(app/admin)はこのレイアウトの外に置き、
// ヘッダー・CDかご・広告・アクセス集計などを出さない。
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
      <BasketProvider>
        {/* 試聴中の曲。ページ遷移しても再生を続けるためレイアウトに置く。 */}
        <PreviewProvider>
          <SiteHeader />
          {/* CDかごの右レールはレイアウトの1カラムとして流れに置く（sticky を効かせ、
              position: fixed で広告ユニットに重ならないようにするため）。
              lg 未満ではレールを畳み、下部の sticky バーに切り替える。 */}
          <div className="container-page py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start lg:gap-6">
            <main className="min-w-0">{children}</main>
            <BasketRail />
          </div>
          <SiteFooter />
          <BasketBar />
          <MiniPlayer />
          <WatchlistWidget />
          <HelpButton />
        </PreviewProvider>
      </BasketProvider>
    </>
  );
}
