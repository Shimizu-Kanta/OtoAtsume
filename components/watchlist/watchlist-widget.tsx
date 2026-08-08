"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Trash2, X } from "lucide-react";

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
      <button
        type="button"
        onClick={handleToggle}
        aria-label="気になる曲"
        title="気になる曲"
        className="fixed bottom-20 right-4 z-40 inline-flex size-11 items-center justify-center rounded-full border border-rule bg-ink text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:bottom-24 sm:right-6"
      >
        <Bookmark className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-[color:var(--signal)] text-[10px] font-bold text-ink">
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
      className="fixed inset-0 z-[100] flex items-end justify-end bg-[#16212b]/70 p-4 sm:items-center sm:pr-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="watchlist-panel-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[75vh] w-full max-w-sm overflow-y-auto rounded-[4px] border border-rule bg-panel p-5 shadow-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="watchlist-panel-title" className="text-lg font-bold tracking-tight text-ink">
              気になる曲
            </h2>
            <p className="mt-1 text-sm text-slate">
              新しいカバーが増えたり、まだ登録されていない曲が登録されたりしたら教えます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 rounded-[3px] p-1 text-slate transition-colors hover:bg-[#FAFCFD] hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {items.length === 0 ? (
            <p className="rounded-[3px] border border-rule bg-[color:var(--paper)] p-3 text-sm text-slate">
              まだ何も追加されていません。楽曲ページや、検索結果が0件のページから追加できます。
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-[3px] border border-rule p-3"
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
                      <span className="shrink-0 rounded-[3px] border border-[color:var(--signal)] px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--signal)]">
                        NEW
                      </span>
                    ) : null}
                  </div>
                  {item.artistName ? (
                    <p className="truncate text-xs text-[color:var(--slate-light)]">{item.artistName}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate">
                    {item.songId
                      ? `歌唱記録 ${item.knownCoverCount.toLocaleString("ja-JP")}件`
                      : "まだ登録されていません"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${item.songName}を気になる曲から削除`}
                  className="shrink-0 rounded-[3px] p-1.5 text-slate transition-colors hover:bg-[#FAFCFD] hover:text-[color:var(--error)]"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
