"use client";

import { useState } from "react";
import Link from "next/link";

import { CoverJacket } from "@/components/covers/cover-jacket";
import { SectionHeading } from "@/components/home/section-heading";
import { buildObiText } from "@/lib/covers/obi";
import { coverTypeLabel } from "@/lib/constants";
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

// CDが棚に背表紙で差さっていて、1枚選ぶと引き出されてジャケットが見える、という見せ方の棚。
export function SpineShelf({
  en,
  title,
  description,
  albums,
  emptyMessage = "表示できる歌唱記録がありません。"
}: {
  en?: string;
  title: string;
  description: string;
  albums: CoverAlbum[];
  emptyMessage?: string;
}) {
  // 空パネルを見せないよう、初期状態は先頭を選択済みにする。
  const [selectedKey, setSelectedKey] = useState(() => albums[0]?.key ?? null);

  const selected = albums.find((album) => album.key === selectedKey) ?? albums[0] ?? null;

  return (
    <section className="flex flex-col gap-3.5">
      <SectionHeading en={en} title={title} description={description} />

      {selected ? (
        // 棚の内側。inset の影で、箱の中を覗いている感じを出す。
        <div className="rounded-[3px] border border-rule bg-panel-2 p-[18px] shadow-crate">
          {/* 選択中の背表紙は 14px 持ち上がる。overflow-x:auto で上が切れないよう、
              レールの高さに持ち上げ分の余白を含めておく。 */}
          <div className="scroll-rail overflow-x-auto pb-0.5 pt-4">
            <div className="flex min-h-[154px] items-end gap-[3px]">
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
                      "h-[150px] w-7 shrink-0 overflow-hidden rounded-t-[2px] border-0 p-0 shadow-spine transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected ? "-translate-y-3.5" : "hover:-translate-y-1"
                    )}
                    style={{ backgroundColor: color ?? NEUTRAL_SPINE_COLOR }}
                  >
                    <span
                      aria-hidden="true"
                      className="block h-full w-full truncate px-1 py-2 text-[10px] font-semibold leading-5 text-white [writing-mode:vertical-rl]"
                    >
                      {albumTitle(album)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div aria-hidden="true" className="shelf-board shelf-board-thin mt-0.5" />

          <div
            aria-live="polite"
            className="mt-[22px] flex flex-wrap items-center gap-[18px] rounded-[3px] border border-rule bg-panel p-4"
          >
            <div className="w-[104px] shrink-0">
              <CoverJacket
                src={selected.tracks[0].sourceImageUrl ?? getYouTubeThumbnailUrl(selected.sourceUrl)}
                alt={`${albumTitle(selected)} のサムネイル`}
                coverType={selected.coverType}
                obiText={buildObiText({
                  trackCount: selected.totalTrackCount,
                  coverType: selected.coverType,
                  performedAt: selected.performedAt,
                  compact: true
                })}
                compact
                sizes="104px"
                iconClassName="size-6"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="line-clamp-2 text-base font-bold leading-[1.4] text-ink">
                {albumTitle(selected)}
              </p>
              <p className="truncate text-[13px] text-slate">
                {albumPerformer(selected)?.name ?? "活動者不明"}
              </p>
              <p className="font-mono text-[11px] tabular-nums text-[color:var(--slate-light)]">
                {formatDate(selected.performedAt)} ・ {coverTypeLabel(selected.coverType)}
                {selected.totalTrackCount > 1 ? ` ・ 全${selected.totalTrackCount}曲` : ""}
              </p>
              <Link
                href={`/covers/${selected.tracks[0].id}`}
                className="inline-flex self-start text-[13px] font-bold text-stamp underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
              >
                この一枚を見る →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[3px] border border-rule bg-panel p-5 text-sm text-slate shadow-lift">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
