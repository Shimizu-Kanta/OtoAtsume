import { Suspense } from "react";
import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { StoreBar } from "@/components/store-bar";

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
            {/* ロゴ: 帯付きジャケットのマーク + 見出し書体のサイト名 */}
            <Link
              href="/"
              className="group inline-flex h-10 items-center gap-2.5 rounded-[3px] transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-[42px]"
              aria-label="おとあつめ ホーム"
            >
              <img src="/logo-mark.svg" alt="" className="size-10 sm:size-[42px]" />
              <span className="font-heading text-[22px] font-bold leading-none tracking-[0.04em] text-ink sm:text-[26px]">
                おとあつめ
              </span>
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
