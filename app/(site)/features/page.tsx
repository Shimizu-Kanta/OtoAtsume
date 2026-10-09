import Link from "next/link";
import type { Metadata } from "next";

import { Breadcrumb } from "@/components/breadcrumb";
import { CoverJacket } from "@/components/covers/cover-jacket";
import { PageHeading } from "@/components/page-heading";
import { listPublishedFeatures, type FeatureCard } from "@/lib/data/features";
import { formatDate } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "特集",
  description:
    "おとあつめのスタッフが、テーマごとに歌ってみた・歌枠の歌唱記録を紹介する特集の一覧です。",
  alternates: { canonical: "/features" },
  openGraph: {
    type: "website",
    url: "/features",
    siteName: "おとあつめ",
    title: "特集 | おとあつめ"
  }
};

function excerpt(lead: string, max = 100): string {
  const flat = lead.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export default async function FeaturesPage() {
  const features = await listPublishedFeatures();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "特集", href: "/features" }]} />
      <PageHeading
        eyebrow="staff picks"
        title="特集"
        description="スタッフがテーマごとに歌唱記録を紹介します。"
      />

      {features.length === 0 ? (
        <div className="rounded-[3px] border border-rule bg-panel p-6 text-sm text-slate shadow-lift">
          まだ公開されている特集はありません。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <FeatureListCard key={feature.id} feature={feature} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureListCard({ feature }: { feature: FeatureCard }) {
  const first = feature.items[0];
  const thumbnail = first
    ? first.cover.sourceImageUrl ?? getYouTubeThumbnailUrl(first.cover.sourceUrl)
    : null;

  return (
    <Link
      href={`/features/${feature.slug}`}
      className="group flex gap-4 rounded-[3px] border border-rule bg-panel p-4 shadow-lift transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="w-[92px] shrink-0">
        <CoverJacket
          src={thumbnail}
          alt=""
          coverType={first ? first.cover.coverType : "OTHER"}
          plain
          sizes="92px"
          iconClassName="size-6"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold leading-[1.4] text-ink underline-offset-4 group-hover:underline">
          {feature.title}
        </h2>
        <p className="mt-1 font-mono text-[10px] tabular-nums text-[color:var(--slate-light)]">
          {feature.publishedAt ? formatDate(feature.publishedAt) : ""} / {feature._count.items}曲
        </p>
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-[1.7] text-slate">
          {excerpt(feature.lead)}
        </p>
      </div>
    </Link>
  );
}
