"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";

import { PreviewPlayer } from "@/components/basket/preview-player";
import { useBasket } from "@/lib/basket/context";
import { usePreview, useIsRailLayout } from "@/lib/basket/preview-context";
import { withTimestamp } from "@/lib/utils";

// lg 未満の試聴機。画面下に固定し、スクロールやページ遷移（クライアント遷移）の間も
// 再生を続ける。lg 以上は右レールの試聴機を使うので描画しない。
//
// YouTube の埋め込みは 200x200px 以上の表示領域が必要なので、動画は幅いっぱいの
// 16:9 で見せる（ジャケットの代わりに動画そのものを出す）。縮めたり隠したりしない。
//
// 位置の調整用 CSS 変数:
//   --bottom-anchor-h … 画面下に別の固定要素（アンカー広告など）を置くときの高さ。その上に出す。
//   --mini-player-h   … このプレイヤーの高さ。body の下余白や、下部の固定ボタンの位置に使う。
export function MiniPlayer() {
  const basket = useBasket();
  const { nowPlaying, stop } = usePreview();
  const isRail = useIsRailLayout();
  const ref = useRef<HTMLDivElement>(null);
  const visible = Boolean(nowPlaying) && !isRail;

  // 高さを実測して配る。閉じたら 0 に戻す。
  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;

    if (!visible || !element) {
      root.style.removeProperty("--mini-player-h");
      return;
    }

    const update = () => root.style.setProperty("--mini-player-h", `${element.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--mini-player-h");
    };
  }, [visible]);

  if (!visible || !nowPlaying) {
    return null;
  }

  const watchUrl = withTimestamp(nowPlaying.sourceUrl, nowPlaying.startSeconds);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="試聴中の曲"
      className="fixed inset-x-0 bottom-[var(--bottom-anchor-h,0px)] z-[45] border-t border-rule bg-panel pb-[env(safe-area-inset-bottom)] shadow-modal lg:hidden"
    >
      <div className="mx-auto w-full max-w-md">
        {/* 閉じるとこのコンポーネントごと外れ、PreviewPlayer の後始末で iframe も破棄される。 */}
        <PreviewPlayer
          item={nowPlaying}
          showDetails={false}
          onRemove={(id) => {
            basket.remove(id);
            stop();
          }}
        />

        <div className="flex items-center gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            {/* 元の一枚（詳細ページ）へ戻る導線。 */}
            <Link
              href={`/covers/${nowPlaying.id}`}
              className="block truncate text-xs font-bold text-ink underline-offset-4 hover:underline"
            >
              {nowPlaying.songTitle}
            </Link>
            {nowPlaying.performerNames ? (
              <p className="truncate text-[11px] text-slate">{nowPlaying.performerNames}</p>
            ) : null}
          </div>

          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="YouTubeで見る"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-[2px] text-stamp transition-colors hover:bg-hover"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={stop}
            aria-label="試聴をやめる"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-[2px] text-slate transition-colors hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
