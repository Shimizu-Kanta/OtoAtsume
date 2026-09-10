import Link from "next/link";

import { CoverJacket } from "@/components/covers/cover-jacket";
import { SectionHeading } from "@/components/home/section-heading";
import type { FeatureCard } from "@/lib/data/features";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

// トップの「スタッフのおすすめ」棚。公開済みの特集を最新順に並べる。
// 0本のときは呼び出し側で描画しない（空の棚を出さない）。
export function StaffPicksShelf({ features }: { features: FeatureCard[] }) {
  if (features.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3.5">
      <SectionHeading
        en="staff picks"
        title="スタッフのおすすめ"
        description="テーマごとに歌唱記録を紹介する特集です。"
        action={
          <Link
            href="/features"
            className="text-[13px] font-bold text-stamp underline-offset-4 hover:underline"
          >
            すべて見る
          </Link>
        }
      />

      <div className="scroll-rail overflow-x-auto scroll-smooth px-0.5 pb-2.5 pt-1">
        <div className="flex items-stretch gap-5">
          {features.map((feature) => {
            const first = feature.items[0];
            const thumbnail = first
              ? first.cover.sourceImageUrl ?? getYouTubeThumbnailUrl(first.cover.sourceUrl)
              : null;

            return (
              <Link
                key={feature.id}
                href={`/features/${feature.slug}`}
                className="group flex w-[190px] shrink-0 flex-col gap-2.5 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-[210px]"
              >
                <CoverJacket
                  src={thumbnail}
                  alt=""
                  coverType={first ? first.cover.coverType : "OTHER"}
                  plain
                  sizes="(min-width: 640px) 210px, 190px"
                  iconClassName="size-9"
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] font-bold leading-[18px] text-ink underline-offset-4 group-hover:underline">
                    {feature.title}
                  </p>
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-[color:var(--slate-light)]">
                    {feature._count.items}曲
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <div aria-hidden="true" className="shelf-board shelf-board-float mt-2.5" />
    </section>
  );
}
