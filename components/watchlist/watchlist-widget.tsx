"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, X } from "lucide-react";

import { WATCHLIST_CHANGED_EVENT } from "@/components/watchlist/events";
import {
  applyWatchlistCheckResults,
  countUnread,
  getWatchlist,
  markWatchlistRead,
  removeWatchlistItem,
  shouldRunWatchlistCheck,
  type WatchlistCheckApiResult,
  type WatchlistItem
} from "@/lib/watchlist/storage";

export function WatchlistWidget() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setItems(getWatchlist());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    function handleChanged() {
      refresh();
    }
    window.addEventListener(WATCHLIST_CHANGED_EVENT, handleChanged);
    window.addEventListener("storage", handleChanged);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, handleChanged);
      window.removeEventListener("storage", handleChanged);
    };
  }, [refresh]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const current = getWatchlist();
    if (!shouldRunWatchlistCheck(current)) {
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/watchlist/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: current.map((item) => ({
              id: item.id,
              songName: item.songName,
              artistName: item.artistName,
              songId: item.songId,
              addedAt: item.addedAt,
              lastCheckedAt: item.lastCheckedAt
            }))
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { results: WatchlistCheckApiResult[] };
        applyWatchlistCheckResults(data.results);
        refresh();
      } catch {
        // 照合の失敗はユーザー体験に影響させない(次回の訪問で再試行される)。
      }
    })();

    return () => controller.abort();
  }, [mounted, refresh]);

  if (!mounted) {
    return null;
  }

  const unreadCount = countUnread(items);

  function handleToggle() {
    setOpen((current) => {
      const next = !current;
      if (next && unreadCount > 0) {
        setItems(markWatchlistRead());
      }
      return next;
    });
  }

  function handleRemove(id: string) {
    setItems(removeWatchlistItem(id));
  }

  return (
    <>
      {/* 入荷ベル。カウンターに置かれた真鍮のベルを CSS（div の重ね）で描く。
          SVG に置き換える場合も、真鍮色のグラデーションと台座の比率は保つこと。 */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="入荷ベル（気になる曲）"
        title="入荷ベル（気になる曲）"
        className="fixed bottom-20 right-4 z-40 h-[60px] w-14 border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:bottom-24 sm:right-6"
      >
        {/* 押しボタン（頭頂部の小さな円） */}
        <span
          aria-hidden="true"
          className="absolute left-6 top-px size-2 rounded-full bg-[#B08A4E] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]"
        />
        {/* ドーム（本体） */}
        <span
          aria-hidden="true"
          className="absolute left-[5px] top-[7px] h-7 w-[46px] rounded-[23px_23px_3px_3px] bg-[linear-gradient(150deg,#F2E6C8_10%,#DCC192_45%,#B0894C_100%)] shadow-[0_2px_6px_rgba(22,33,43,.28)]"
        />
        {/* ハイライト */}
        <span
          aria-hidden="true"
          className="absolute left-[14px] top-3 h-[15px] w-2 rounded-[6px] bg-white/55 blur-[.4px]"
        />
        {/* 台座 */}
        <span
          aria-hidden="true"
          className="absolute left-0.5 top-[33px] h-[7px] w-[52px] rounded-[2px_2px_3px_3px] bg-[linear-gradient(#C8A968,#9C7A44)] shadow-[0_2px_5px_rgba(22,33,43,.26)]"
        />
        <span className="absolute inset-x-0 bottom-[5px] font-mono text-[10px] font-semibold tracking-[0.1em] text-slate">
          BELL
        </span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stamp px-1 font-mono text-[11px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? <WatchlistPanel items={items} onClose={() => setOpen(false)} onRemove={handleRemove} /> : null}
    </>
  );
}

function WatchlistPanel({
  items,
  onClose,
  onRemove
}: {
  items: WatchlistItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-end bg-[#16212b]/[0.55] p-4 sm:items-center sm:pr-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="watchlist-panel-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[78vh] w-full max-w-[380px] overflow-y-auto rounded-[2px] border border-wood-dark bg-panel shadow-modal"
      >
        {/* ヘッダーはクラフト紙。下辺の破線は伝票の切り取り線の見立て。 */}
        <div className="flex items-start justify-between gap-3 border-b border-dashed border-wood-dark bg-kraft px-[18px] py-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-wood-dark">
              counter bell
            </p>
            <h2 id="watchlist-panel-title" className="mt-1.5 text-[17px] font-bold text-kraft-ink">
              入荷ベル
            </h2>
            <p className="mt-1 text-xs leading-[1.7] text-slate">
              新しいカバーが増えたり、まだ登録されていない曲が登録されたりしたら教えます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 rounded-[2px] p-1 text-wood-dark transition-colors hover:bg-panel hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-[18px] pb-[18px] pt-3.5">
          {items.length === 0 ? (
            <p className="rounded-[2px] border border-dashed border-rule p-3 text-sm text-slate">
              まだ何も追加されていません。楽曲ページや、検索結果が0件のページから追加できます。
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-dashed border-[#CDBBA0] py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {item.songId ? (
                      <Link
                        href={`/songs/${item.songId}`}
                        onClick={onClose}
                        className="truncate font-semibold text-ink underline-offset-4 hover:underline"
                      >
                        {item.songName}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold text-ink">{item.songName}</span>
                    )}
                    {item.hasUpdate ? (
                      <span className="shrink-0 rounded-[2px] border border-stamp px-1.5 py-0.5 font-mono text-[9px] font-semibold text-stamp">
                        NEW
                      </span>
                    ) : null}
                  </div>
                  {item.artistName ? (
                    <p className="truncate text-xs text-[color:var(--slate-light)]">{item.artistName}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-slate">
                    {item.songId
                      ? `在庫 ${item.knownCoverCount.toLocaleString("ja-JP")}件`
                      : "まだ入荷していません"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${item.songName}を入荷ベルから取り下げる`}
                  className="shrink-0 rounded-[2px] p-1.5 text-[color:var(--slate-light)] transition-colors hover:bg-hover hover:text-[color:var(--error)]"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))
          )}

          <p className="mt-3.5 text-center font-mono text-[10px] leading-[1.9] tracking-[0.04em] text-[color:var(--slate-light)]">
            *** 会員登録は不要です ***
            <br />
            THANK YOU
          </p>
        </div>
      </div>
    </div>
  );
}
