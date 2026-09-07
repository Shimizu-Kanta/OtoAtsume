"use client";

import { useState } from "react";
import Link from "next/link";

import { CoverJacket } from "@/components/covers/cover-jacket";
import { CoverTypeTag } from "@/components/covers/cover-type-tag";
import { PerformerColorChip } from "@/components/performers/performer-color-chip";
import type { CoverAlbum } from "@/lib/data/covers";
import { cn, formatDate } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

// 裏ジャケに出す収録曲の最大件数。これを超えた分は「ほか N 曲」にまとめる。
const MAX_VISIBLE_TRACKS = 6;

export function CoverAlbumCard({ album }: { album: CoverAlbum }) {
  const [open, setOpen] = useState(false);

  const head = album.tracks[0];
  const isAlbum = album.totalTrackCount > 1;
  const thumbnailUrl = head.sourceImageUrl ?? getYouTubeThumbnailUrl(album.sourceUrl);
  const performers = head.performers.map(({ performer }) => performer);
  const artists = head.song.artists.map(({ artist }) => artist.name).join(", ");
  // 検索で絞り込まれている場合のみ「一致: ◯◯」を出す。これが無いと曲名で検索したときに
  // 「探した曲がどのアルバムに入っているか分からない」状態になる。
  const matchedCount = album.tracks.length;
  const showMatch = isAlbum && matchedCount < album.totalTrackCount && matchedCount > 0;
  const visibleTracks = album.tracks.slice(0, MAX_VISIBLE_TRACKS);
  const hiddenTrackCount = album.tracks.length - visibleTracks.length;

  return (
    // カード外枠はリンクではない。バッジと収録曲リンクがあるため、カード全体を <a> で
    // 囲むと <a> の入れ子になり HTML として不正・スクリーンリーダーでも壊れる。
    // 代わりにタイトルの <a> に after:absolute after:inset-0 を付けて全面をクリック可能にする。
    <div
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[8px] border bg-card transition-colors duration-200 hover:border-primary/40 focus-within:border-primary/40"
      style={{
        borderTopColor: performers.find((performer) => performer.colorCode)?.colorCode ?? undefined,
        borderTopWidth: performers.some((performer) => performer.colorCode) ? 4 : undefined
      }}
    >
      {/* 右の余白は積み重ね表現の帯を置く溝。アルバムでも単曲でも同じ幅を確保して、
          グリッド内でジャケットのサイズが揃うようにする。 */}
      <div className="relative pr-2">
        <div className="relative overflow-hidden rounded-[6px]">
          <CoverJacket
            src={thumbnailUrl}
            alt={`${album.sourceTitle ?? head.song.title} のサムネイル`}
            coverType={album.coverType}
            variant="frame"
            sizes="(min-width: 1280px) 200px, (min-width: 640px) 25vw, 45vw"
            iconClassName="size-9"
          />

          {/* 裏ジャケ（収録曲）。カードの高さを変えないよう、インライン展開せず
              ジャケット面に absolute で重ねる。PC はホバー、全デバイスでバッジ操作で開く。 */}
          {isAlbum ? (
            <div
              className={cn(
                "absolute inset-0 z-10 flex flex-col bg-foreground/[0.92] p-2.5 transition-opacity duration-200",
                open
                  ? "opacity-100"
                  : "pointer-events-none opacity-0 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100"
              )}
            >
              <p className="mb-1.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-background/70">
                Tracks
              </p>
              <ol className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                {visibleTracks.map((track, index) => (
                  <li key={track.id} className="flex gap-1.5 text-[11px] leading-4 text-background">
                    <span className="shrink-0 font-mono tabular-nums text-background/60">
                      {index + 1}.
                    </span>
                    <Link
                      href={`/covers/${track.id}`}
                      className="line-clamp-1 hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      {track.song.title}
                    </Link>
                  </li>
                ))}
              </ol>
              {hiddenTrackCount > 0 ? (
                <p className="mt-1 shrink-0 text-[11px] leading-4 text-background/70">
                  ほか{hiddenTrackCount}曲
                </p>
              ) : null}
            </div>
          ) : null}

          {/* 曲数バッジ。タップ/クリックで裏ジャケを開閉する。 */}
          {isAlbum ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={`収録曲${album.totalTrackCount}曲を${open ? "閉じる" : "表示"}`}
              className="absolute right-1.5 top-1.5 z-20 inline-flex items-center rounded-[3px] bg-foreground/85 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-background transition-colors hover:bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {album.totalTrackCount}曲
            </button>
          ) : null}
        </div>

        {/* 積み重ね表現: ジャケット右端の外側に細い縦帯を2本、外側ほど薄く重ねる。 */}
        {isAlbum ? (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-y-2 right-[4px] w-[3px] rounded-r-[2px] bg-foreground/25"
            />
            <span
              aria-hidden="true"
              className="absolute inset-y-4 right-0 w-[3px] rounded-r-[2px] bg-foreground/[0.12]"
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0 space-y-1.5">
          {/* カードのタイトルは文書構造上の見出しではないため、見出しタグを使わず装飾テキストにする
              （セクション見出しの h2 と階層が競合しないようにする）。
              遷移先は代表 cover の詳細ページ。このページは getOtherCoversBySourceVideoId と
              SetlistDisclosure により、既に同一動画の全曲を表示している。 */}
          <p className="line-clamp-2 text-sm font-bold leading-5 text-foreground">
            <Link
              href={`/covers/${head.id}`}
              className="after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-none focus-visible:underline"
            >
              {isAlbum ? album.sourceTitle ?? head.song.title : head.song.title}
            </Link>
          </p>

          {performers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {performers.map((performer) => (
                <PerformerColorChip
                  key={performer.id}
                  name={performer.name}
                  colorCode={performer.colorCode}
                />
              ))}
            </div>
          ) : null}

          {!isAlbum && artists ? (
            <p className="truncate text-xs text-muted-foreground">{artists}</p>
          ) : null}
        </div>

        {showMatch ? (
          <p className="truncate text-xs text-[color:var(--aqua-deep)]">
            一致: {head.song.title}
            {matchedCount > 1 ? ` ほか${matchedCount - 1}曲` : ""}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-rule pt-2.5">
          <CoverTypeTag type={album.coverType} />
          <span className="font-mono text-xs tabular-nums text-slate">
            {formatDate(album.performedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
