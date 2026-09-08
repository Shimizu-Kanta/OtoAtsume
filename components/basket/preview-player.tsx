"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

import type { BasketItem } from "@/lib/basket/types";
import { withTimestamp } from "@/lib/utils";

// YouTube IFrame Player API の、この画面で使う分だけの型。
// @types/youtube は入れていないので必要最小限を自前で持つ。
type YTPlayer = {
  loadVideoById: (options: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  getCurrentTime: () => number;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
// 区間の終わりを見張る間隔。ユーザーがシークバーを触ると endSeconds が無効になるため、
// これが唯一の停止保険になる。長くすると次の曲へ食い込む。
const END_GUARD_INTERVAL_MS = 250;

let apiPromise: Promise<YTNamespace> | null = null;

function loadIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    // API 側は window.onYouTubeIframeAPIReady を1つしか呼ばないため、
    // 既存のコールバックがあれば繋いでおく。
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YT.Player is unavailable"));
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${IFRAME_API_SRC}"]`);
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src = IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("failed to load the YouTube IFrame API"));
    document.head.appendChild(script);
  });

  return apiPromise;
}

// エラーコードの意味。101 / 150 は投稿者が埋め込みを無効にしている場合で、
// これは活動者の意思表示なので迂回しない。YouTube で見てもらう。
function describeError(code: number): { message: string; removable: boolean } {
  if (code === 101 || code === 150) {
    return { message: "この動画は埋め込みが無効です。YouTubeでご覧ください。", removable: false };
  }
  if (code === 100) {
    return { message: "この動画は削除されたか非公開です。", removable: true };
  }
  if (code === 2 || code === 5) {
    return { message: "この動画は再生できませんでした。YouTubeでご覧ください。", removable: false };
  }
  return { message: "再生できませんでした。YouTubeでご覧ください。", removable: false };
}

export function PreviewPlayer({
  item,
  onRemove
}: {
  // いま試聴機に掛かっている一枚。null なら何も掛かっていない。
  item: BasketItem | null;
  onRemove?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const guardRef = useRef<number | null>(null);
  // 区間の終わり。ポーリングから最新値を読むため ref に持つ。
  const endSecondsRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<{ message: string; removable: boolean } | null>(null);

  const stopGuard = useCallback(() => {
    if (guardRef.current !== null) {
      window.clearInterval(guardRef.current);
      guardRef.current = null;
    }
  }, []);

  // seekTo() を呼ぶと loadVideoById に渡した endSeconds が無効になる。
  // ユーザーがシークバーを触った瞬間に区間指定が外れて次の曲まで流れ続けるため、
  // 再生中は現在位置を見張り、終了時刻を越えたら自前で止める。
  const startGuard = useCallback(() => {
    stopGuard();

    guardRef.current = window.setInterval(() => {
      const end = endSecondsRef.current;
      const player = playerRef.current;

      if (end == null || !player) {
        return;
      }

      if (player.getCurrentTime() >= end) {
        player.pauseVideo();
        stopGuard();
      }
    }, END_GUARD_INTERVAL_MS);
  }, [stopGuard]);

  useEffect(() => {
    let cancelled = false;

    loadIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current || playerRef.current) {
          return;
        }

        playerRef.current = new YT.Player(containerRef.current, {
          playerVars: {
            // iOS でインライン再生させる。指定しないと全画面に奪われる。
            playsinline: 1,
            rel: 0,
            modestbranding: 1
          },
          events: {
            onReady: () => {
              if (!cancelled) {
                setReady(true);
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                startGuard();
                return;
              }
              // 1曲終わっても次に進まない。ユーザーが自分で次を押す。
              stopGuard();
            },
            onError: (event) => {
              if (!cancelled) {
                stopGuard();
                setError(describeError(event.data));
              }
            }
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError({ message: "プレイヤーを読み込めませんでした。", removable: false });
        }
      });

    return () => {
      cancelled = true;
      stopGuard();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [startGuard, stopGuard]);

  // 掛ける一枚が変わったら読み込み直す。
  useEffect(() => {
    setError(null);
    endSecondsRef.current = item?.endSeconds ?? null;

    if (!item?.sourceVideoId || !ready || !playerRef.current) {
      return;
    }

    playerRef.current.loadVideoById({
      videoId: item.sourceVideoId,
      startSeconds: item.startSeconds ?? 0,
      // endSeconds はシーク操作で無効になるが、指定しておけば通常再生では効く。
      // 保険は startGuard 側。
      ...(item.endSeconds != null ? { endSeconds: item.endSeconds } : {})
    });
  }, [item, ready]);

  const watchUrl = item ? withTimestamp(item.sourceUrl, item.startSeconds) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* プレイヤーはパネル幅いっぱいの 16:9 で出す。極端に縮めたり隠したりしない。 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-[2px] bg-board">
        <div ref={containerRef} className="absolute inset-0 size-full" />

        {!item ? (
          <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-board-sub">
            再生ボタンを押すと、ここで1曲ずつ試聴できます。
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-board px-3 text-center">
            <p className="text-xs leading-5 text-board-ink">{error.message}</p>
            {watchUrl ? (
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[2px] bg-stamp px-3 py-1.5 text-xs font-bold text-white"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                YouTubeで見る
              </a>
            ) : null}
            {error.removable && item && onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-[11px] text-board-sub underline underline-offset-2"
              >
                かごから出す
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 配信名・活動者名・YouTube への導線は常に出す。
          このサイトが YouTube の代替ではなく入口であることを担保する。 */}
      {item ? (
        <div className="flex flex-col gap-1">
          <p className="truncate text-xs font-bold text-ink">{item.songTitle}</p>
          {item.performerNames ? (
            <p className="truncate text-[11px] text-slate">{item.performerNames}</p>
          ) : null}
          {item.sourceTitle ? (
            <p className="truncate text-[11px] text-[color:var(--slate-light)]">{item.sourceTitle}</p>
          ) : null}
          {watchUrl ? (
            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 self-start text-[11px] font-bold text-stamp underline-offset-4 hover:underline"
            >
              <ExternalLink className="size-3" aria-hidden="true" />
              YouTubeで見る
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
