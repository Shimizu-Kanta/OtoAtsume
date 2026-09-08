"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, GripVertical, Play, Trash2 } from "lucide-react";

import { PreviewPlayer } from "@/components/basket/preview-player";
import { useBasket } from "@/lib/basket/context";
import { buildTakeawayPlaylist, buildTrackListText } from "@/lib/basket/takeaway";
import type { BasketItem } from "@/lib/basket/types";
import { isPreviewable } from "@/lib/basket/types";
import { cn, withTimestamp } from "@/lib/utils";

// CDかごの中身。PC の右レールとスマホのボトムシートで同じものを使う。
export function BasketPanel({ onNavigate }: { onNavigate?: () => void }) {
  const basket = useBasket();
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const nowPlaying = useMemo(
    () => basket.items.find((item) => item.id === nowPlayingId) ?? null,
    [basket.items, nowPlayingId]
  );

  const takeaway = useMemo(() => buildTakeawayPlaylist(basket.items), [basket.items]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildTrackListText(basket.items));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では何もしない。
    }
  }, [basket.items]);

  const handleRemove = useCallback(
    (id: string) => {
      basket.remove(id);
      setNowPlayingId((current) => (current === id ? null : current));
    },
    [basket]
  );

  if (basket.count === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        <BasketHeading count={0} />
        {/* 「かごは空です」だけだと何の機能か分からないので、用途を書く。 */}
        <p className="rounded-[2px] border border-dashed border-rule p-3 text-xs leading-[1.9] text-slate">
          かごは空です。気になる曲を入れると、ここで1曲ずつ試聴したり、YouTubeでまとめて聴けます。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BasketHeading count={basket.count} />

      <PreviewPlayer item={nowPlaying} onRemove={handleRemove} />

      {basket.error ? (
        <p className="text-xs text-[color:var(--error)]">{basket.error}</p>
      ) : null}

      <ol className="flex flex-col">
        {basket.items.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={() => {
              dragIndex.current = index;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex.current !== null) {
                basket.move(dragIndex.current, index);
                dragIndex.current = null;
              }
            }}
            className={cn(
              "flex items-start gap-1.5 border-b border-dashed border-rule py-2",
              item.id === nowPlayingId && "bg-hover"
            )}
          >
            {/* ドラッグでの並べ替え。ドラッグできない環境向けに、
                ハンドルにフォーカスして上下キーでも動かせるようにする。 */}
            <span
              role="button"
              tabIndex={0}
              aria-label={`${item.songTitle}の順番を変える`}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  basket.move(index, Math.max(0, index - 1));
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  basket.move(index, Math.min(basket.items.length - 1, index + 1));
                }
              }}
              className="mt-0.5 shrink-0 cursor-grab text-[color:var(--slate-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GripVertical className="size-3.5" aria-hidden="true" />
            </span>

            <BasketRow
              item={item}
              playing={item.id === nowPlayingId}
              onPlay={() => setNowPlayingId(item.id)}
              onRemove={() => handleRemove(item.id)}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-1.5">
        {takeaway.url ? (
          <a
            href={takeaway.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[2px] bg-stamp px-3 text-xs font-bold text-white shadow-press transition-[filter] hover:brightness-110"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            通して聴く（YouTube）
          </a>
        ) : null}

        <p className="text-[11px] leading-[1.8] text-[color:var(--slate-light)]">
          {takeaway.truncated
            ? `配信 ${takeaway.videoCount} 本まで持ち帰れます。超えた分は含まれません。`
            : `配信 ${takeaway.videoCount} 本にまとめて開きます。`}
          <br />
          配信の先頭から再生されます。保存はされません。
        </p>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[2px] border border-rule bg-panel px-3 text-xs font-bold text-ink transition-colors hover:bg-hover"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          {copied ? "コピーしました" : "曲リストをコピー"}
        </button>

        <button
          type="button"
          onClick={() => {
            basket.clear();
            setNowPlayingId(null);
          }}
          className="inline-flex h-8 items-center justify-center text-[11px] text-slate underline-offset-4 hover:text-ink hover:underline"
        >
          かごを空にする
        </button>
      </div>
    </div>
  );
}

function BasketHeading({ count }: { count: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <p className="eyebrow">CD basket</p>
      <p className="font-mono text-[11px] tabular-nums text-slate">{count}曲</p>
    </div>
  );
}

function BasketRow({
  item,
  playing,
  onPlay,
  onRemove,
  onNavigate
}: {
  item: BasketItem;
  playing: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onNavigate?: () => void;
}) {
  const watchUrl = withTimestamp(item.sourceUrl, item.startSeconds);

  return (
    <>
      <span className="min-w-0 flex-1">
        <a
          href={`/covers/${item.id}`}
          onClick={onNavigate}
          className="block truncate text-xs font-bold text-ink underline-offset-4 hover:underline"
        >
          {item.songTitle}
        </a>
        {item.performerNames ? (
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.performerColor ?? "var(--slate-light)" }}
            />
            <span className="truncate text-[11px] text-slate">{item.performerNames}</span>
          </span>
        ) : null}
        {item.sourceTitle ? (
          <span className="mt-0.5 block truncate text-[10px] text-[color:var(--slate-light)]">
            {item.sourceTitle}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 items-center gap-0.5">
        {/* サイト内で試聴できるのは YouTube の動画に紐づくものだけ。
            それ以外は再生ボタンを出さず YouTube へのリンクにする。 */}
        {isPreviewable(item) ? (
          <button
            type="button"
            onClick={onPlay}
            aria-label={`${item.songTitle}を試聴する`}
            aria-pressed={playing}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              playing ? "bg-stamp text-white" : "text-slate hover:bg-hover hover:text-ink"
            )}
          >
            <Play className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${item.songTitle}をYouTubeで見る`}
            className="inline-flex size-6 items-center justify-center rounded-[2px] text-slate transition-colors hover:bg-hover hover:text-ink"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        )}

        <button
          type="button"
          onClick={onRemove}
          aria-label={`${item.songTitle}をかごから出す`}
          className="inline-flex size-6 items-center justify-center rounded-[2px] text-[color:var(--slate-light)] transition-colors hover:bg-hover hover:text-[color:var(--error)]"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </span>
    </>
  );
}
