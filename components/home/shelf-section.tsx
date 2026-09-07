import type { ReactNode } from "react";
import Link from "next/link";

import { CoverAlbumCard } from "@/components/covers/cover-album-card";
import { CoverCarousel } from "@/components/home/cover-carousel";
import { SectionHeading } from "@/components/home/section-heading";
import { buttonVariants } from "@/components/ui/button";
import type { CoverAlbum } from "@/lib/data/covers";
import { cn } from "@/lib/utils";

// 横スクロールの「棚」。見出し + カルーセル + 正方形ジャケットのカードをまとめたもの。
export function ShelfSection({
  icon,
  title,
  description,
  albums,
  actionHref,
  actionLabel,
  emptyMessage = "表示できる歌唱記録がありません。",
  representativeOnly = false
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  albums: CoverAlbum[];
  actionHref?: string;
  actionLabel?: string;
  emptyMessage?: string;
  // tracks が代表1曲のみの棚（attachTrackCounts 経由）で true にする。
  representativeOnly?: boolean;
}) {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={icon}
        title={title}
        description={description}
        action={
          actionHref && actionLabel ? (
            <Link href={actionHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {actionLabel}
            </Link>
          ) : null
        }
      />

      {albums.length > 0 ? (
        <CoverCarousel itemLayout="shelf">
          {albums.map((album) => (
            <CoverAlbumCard key={album.key} album={album} representativeOnly={representativeOnly} />
          ))}
        </CoverCarousel>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-5 text-sm text-slate">{emptyMessage}</div>
      )}
    </section>
  );
}
