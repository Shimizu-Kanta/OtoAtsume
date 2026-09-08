import { Suspense } from "react";
import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { StoreBar } from "@/components/store-bar";

const siteLogoSrc = process.env.NEXT_PUBLIC_SITE_LOGO_SRC ?? "/site-logo.svg";

export function SiteHeader() {
  return (
    <header>
      {/* 在庫の掲示は DB を引くので、ヘッダーの描画をブロックしないよう Suspense に包む。
          フォールバックは同じ高さの空の帯にして、読み込み後にレイアウトが飛ばないようにする。 */}
      <Suspense fallback={<div className="h-[29px] border-b border-board-deep bg-board" />}>
        <StoreBar />
      </Suspense>

      <div className="border-b border-rule bg-gradient-to-b from-panel to-panel-2">
        <div className="container-page flex flex-col gap-4 pt-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5 pb-3.5">
            <Link
              href="/"
              className="group inline-flex items-center rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="おとあつめ ホーム"
            >
              <img
                src={siteLogoSrc}
                alt="おとあつめ"
                className="h-10 w-auto max-w-[180px] object-contain transition-opacity group-hover:opacity-85 sm:h-[42px] sm:max-w-[220px]"
              />
            </Link>
            {/* 縦積み3行の英字ラベル。値札の刷り込みに見立てたもの。 */}
            <span className="hidden border-l border-rule pl-3.5 font-mono text-[10px] font-semibold uppercase leading-[1.6] tracking-[0.2em] text-[color:var(--slate-light)] sm:inline-block">
              Song
              <br />
              Archive
              <br />
              Store
            </span>
          </div>

          <SiteNav />
        </div>
      </div>
    </header>
  );
}
