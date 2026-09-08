"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CoverAlbumCard } from "@/components/covers/cover-album-card";
import { SectionHeading } from "@/components/home/section-heading";
import type { CoverAlbum } from "@/lib/data/covers";

// 横スクロールの「棚」。見出し + 一枚ずつ立てたジャケット + 下に渡した棚板。
// 棚板（shelf-board）はこのデザインの一番の要なので、木目とグラデーションは変えないこと。
export function ShelfSection({
  en,
  title,
  description,
  albums,
  actionHref,
  actionLabel,
  emptyMessage = "表示できる歌唱記録がありません。",
  representativeOnly = false
}: {
  en?: string;
  title: string;
  description: string;
  albums: CoverAlbum[];
  actionHref?: string;
  actionLabel?: string;
  emptyMessage?: string;
  // tracks が代表1曲のみの棚（attachTrackCounts 経由）で true にする。
  representativeOnly?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "prev" | "next") {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const distance = Math.max(viewport.clientWidth * 0.85, 300);
    viewport.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth"
    });
  }

  return (
    <section className="flex flex-col gap-3.5">
      <SectionHeading
        en={en}
        title={title}
        description={description}
        action={
          albums.length > 0 ? (
            <div className="flex items-center gap-2">
              {actionHref && actionLabel ? (
                <Link
                  href={actionHref}
                  className="text-[13px] font-bold text-stamp underline-offset-4 hover:underline"
                >
                  {actionLabel}
                </Link>
              ) : null}
              <ShelfArrow direction="prev" onClick={() => scroll("prev")} />
              <ShelfArrow direction="next" onClick={() => scroll("next")} />
            </div>
          ) : null
        }
      />

      {albums.length > 0 ? (
        <div>
          {/* 棚のレール。overflow-hidden は付けないこと（CD 盤が枠外に覗く）。
              overflow-x:auto は overflow-y も auto にするため、ジャケットの落ち影が
              切れないよう上下に余白を取る。 */}
          <div ref={viewportRef} className="scroll-rail overflow-x-auto scroll-smooth px-0.5 pb-2.5 pt-1">
            <div className="flex items-stretch gap-5">
              {albums.map((album) => (
                <div key={album.key} className="w-[150px] shrink-0 sm:w-[170px]">
                  <CoverAlbumCard album={album} representativeOnly={representativeOnly} />
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden="true" className="shelf-board shelf-board-float mt-2.5" />
        </div>
      ) : (
        <div className="rounded-[3px] border border-rule bg-panel p-5 text-sm text-slate shadow-lift">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function ShelfArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "前の歌唱記録を表示" : "次の歌唱記録を表示"}
      className="inline-flex size-[34px] items-center justify-center rounded-[2px] border border-rule bg-panel text-slate transition-colors hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
