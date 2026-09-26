"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

import { AddToBasketButton } from "@/components/basket/add-to-basket-button";
import { CoverThumbnail } from "@/components/covers/cover-thumbnail";
import { buildTakeawayPlaylist, buildTrackListText } from "@/lib/basket/takeaway";
import type { PlaylistTrack } from "@/lib/data/playlist";
import { formatDate } from "@/lib/utils";

// 抽選結果の一覧。「これを再生」は かご の持ち帰りと同じ watch_videos を使う。
// 非公式のエンドポイントなので、かごと同じく「曲リストをコピー」を必ず併設する。
export function PlaylistResult({ tracks }: { tracks: PlaylistTrack[] }) {
  const [copied, setCopied] = useState(false);
  const takeaway = useMemo(() => buildTakeawayPlaylist(tracks), [tracks]);
  const coverIds = useMemo(() => tracks.map((track) => track.id), [tracks]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildTrackListText(tracks));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では何もしない。
    }
  }, [tracks]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-2">
        {takeaway.url ? (
          <a
            href={takeaway.url}
            target="_blank"
            rel="noreferrer"
            className="press-button inline-flex h-10 items-center justify-center gap-2 rounded-[2px] bg-stamp px-4 text-sm font-bold text-white shadow-press transition-[filter] hover:brightness-110"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            これを再生（YouTube）
          </a>
        ) : null}
        <AddToBasketButton
          variant="button"
          coverIds={coverIds}
          matchMode="all"
          label="まとめてかごに入れる"
          addedLabel="かごから出す"
          className="border border-rule bg-panel text-ink shadow-none hover:bg-hover hover:brightness-100"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[2px] border border-rule bg-panel px-4 text-sm font-bold text-ink transition-colors hover:bg-hover"
        >
          <Copy className="size-4" aria-hidden="true" />
          {copied ? "コピーしました" : "曲リストをコピー"}
        </button>
      </div>
      <p className="text-[11px] leading-[1.8] text-[color:var(--slate-light)]">
        YouTube の一時プレイリストとして開きます（保存はされません）。
      </p>

      <ol className="flex flex-col border-t border-rule">
        {tracks.map((track, index) => (
          <li key={track.id} className="flex items-center gap-3 border-b border-dashed border-rule py-2.5">
            <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-slate">
              {index + 1}
            </span>
            <a
              href={track.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-[2px] bg-panel-2 sm:w-32"
              aria-label={`${track.songTitle}をYouTubeで開く`}
            >
              <CoverThumbnail
                src={track.thumbnailUrl}
                alt=""
                coverType={track.coverType}
                sizes="128px"
                iconClassName="size-6"
              />
            </a>
            <div className="min-w-0 flex-1">
              <a
                href={`/covers/${track.id}`}
                className="block truncate text-sm font-bold text-ink underline-offset-4 hover:underline"
              >
                {track.songTitle}
              </a>
              {track.artistNames ? (
                <p className="truncate text-xs text-slate">原曲: {track.artistNames}</p>
              ) : null}
              <p className="truncate text-xs text-slate">
                {track.performerNames || "歌唱者未設定"}
                <span className="ml-2 font-mono tabular-nums text-[color:var(--slate-light)]">
                  {formatDate(track.performedAt)}
                </span>
              </p>
            </div>
            <AddToBasketButton coverIds={[track.id]} label={`${track.songTitle}をかごに入れる`} />
          </li>
        ))}
      </ol>
    </div>
  );
}
