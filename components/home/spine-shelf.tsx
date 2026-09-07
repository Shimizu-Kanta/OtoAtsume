"use client";

import { useState } from "react";
import Link from "next/link";

import { CoverJacket } from "@/components/covers/cover-jacket";
import { SectionHeading } from "@/components/home/section-heading";
import type { CoverAlbum } from "@/lib/data/covers";
import { clampPerformerColor } from "@/lib/performer-color";
import { cn, formatDate } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

// 背表紙の色。活動者カラーが無い場合はニュートラルな罫線色にする。
const NEUTRAL_SPINE_COLOR = "var(--slate-light)";

function albumPerformer(album: CoverAlbum) {
  return album.tracks[0]?.performers[0]?.performer ?? null;
}

function albumTitle(album: CoverAlbum) {
  return album.sourceTitle ?? album.tracks[0]?.song.title ?? "";
}

// CDが棚に背表紙で差さっていて、1枚選ぶとジャケットが見える、という見せ方の棚。
export function SpineShelf({
  title,
  description,
  albums,
  emptyMessage = "表示できる歌唱記録がありません。"
}: {
  title: string;
  description: string;
  albums: CoverAlbum[];
  emptyMessage?: string;
}) {
  // 空パネルを見せないよう、初期状態は先頭を選択済みにする。
  const [selectedKey, setSelectedKey] = useState(() => albums[0]?.key ?? null);

  const selected = albums.find((album) => album.key === selectedKey) ?? albums[0] ?? null;

  return (
    <section className="space-y-4">
      <SectionHeading title={title} description={description} />

      {selected ? (
        <div className="space-y-3">
          <div className="-mx-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-end gap-[3px]">
              {albums.map((album) => {
                const performer = albumPerformer(album);
                const color = clampPerformerColor(performer?.colorCode);
                const isSelected = album.key === selected.key;

                return (
                  <button
                    key={album.key}
                    type="button"
                    onClick={() => setSelectedKey(album.key)}
                    aria-pressed={isSelected}
                    // 縦書きテキストはスクリーンリーダーで読みにくいため、
                    // ラベルで内容を補う。
                    aria-label={`${albumTitle(album)} / ${performer?.name ?? "活動者不明"}`}
                    className={cn(
                      "h-[150px] w-[26px] shrink-0 overflow-hidden rounded-t-[2px] border border-rule transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected ? "-translate-y-2" : "hover:-translate-y-1"
                    )}
                    style={{ backgroundColor: color ?? NEUTRAL_SPINE_COLOR }}
                  >
                    <span
                      aria-hidden="true"
                      className="block h-full w-full truncate px-[3px] py-1.5 text-[10px] leading-[20px] text-white [writing-mode:vertical-rl]"
                    >
                      {albumTitle(album)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            aria-live="polite"
            className="flex flex-wrap items-center gap-4 rounded-[4px] border border-rule bg-panel p-4"
          >
            <div className="w-[120px] shrink-0">
              <CoverJacket
                src={selected.tracks[0].sourceImageUrl ?? getYouTubeThumbnailUrl(selected.sourceUrl)}
                alt={`${albumTitle(selected)} のサムネイル`}
                coverType={selected.coverType}
                variant="frame"
                sizes="120px"
                iconClassName="size-7"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="line-clamp-2 text-sm font-bold leading-5 text-ink">{albumTitle(selected)}</p>
              <p className="truncate text-sm text-slate">
                {albumPerformer(selected)?.name ?? "活動者不明"}
              </p>
              <p className="font-mono text-xs tabular-nums text-slate">
                {formatDate(selected.performedAt)}
                {selected.totalTrackCount > 1 ? ` ・ 全${selected.totalTrackCount}曲` : ""}
              </p>
              <Link
                href={`/covers/${selected.tracks[0].id}`}
                className="inline-flex text-sm font-semibold text-[color:var(--aqua-deep)] hover:underline focus-visible:outline-none focus-visible:underline"
              >
                この一枚を見る
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-5 text-sm text-slate">{emptyMessage}</div>
      )}
    </section>
  );
}
