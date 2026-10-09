import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { AddToBasketButton } from "@/components/basket/add-to-basket-button";
import { Breadcrumb } from "@/components/breadcrumb";
import { CoverJacket } from "@/components/covers/cover-jacket";
import {
  getPublishedFeatureBySlug,
  type FeaturePublicDetail
} from "@/lib/data/features";
import { parseFeatureLinks } from "@/lib/validations/feature";
import { absoluteUrl, siteUrl } from "@/lib/site-url";
import { formatDate } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

// 序文の冒頭120字を description に使う。改行は空白に畳む。
function buildDescription(lead: string): string {
  const flat = lead.replace(/\s+/g, " ").trim();
  return flat.length > 120 ? `${flat.slice(0, 120)}…` : flat;
}

function itemThumbnail(item: FeaturePublicDetail["items"][number]): string | null {
  return item.cover.sourceImageUrl ?? getYouTubeThumbnailUrl(item.cover.sourceUrl);
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = await getPublishedFeatureBySlug(slug);

  if (!feature) {
    return { title: "特集が見つかりません" };
  }

  const description = buildDescription(feature.lead);
  const ogImage = feature.items[0] ? itemThumbnail(feature.items[0]) : null;

  return {
    title: feature.title,
    description,
    alternates: { canonical: `/features/${feature.slug}` },
    openGraph: {
      type: "article",
      url: `/features/${feature.slug}`,
      siteName: "おとあつめ",
      title: feature.title,
      description,
      ...(feature.publishedAt ? { publishedTime: feature.publishedAt.toISOString() } : {}),
      ...(ogImage ? { images: [ogImage] } : {})
    },
    twitter: {
      card: "summary_large_image",
      title: feature.title,
      description
    }
  };
}

export default async function FeatureDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = await getPublishedFeatureBySlug(slug);

  // 未公開・存在しない slug は robots:noindex ではなく 404 を返す。
  if (!feature) {
    notFound();
  }

  const links = parseFeatureLinks(feature.links);
  const coverIds = feature.items.map((item) => item.coverId);
  const firstThumbnail = feature.items[0] ? itemThumbnail(feature.items[0]) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: feature.title,
    url: absoluteUrl(`/features/${feature.slug}`),
    inLanguage: "ja",
    ...(feature.publishedAt ? { datePublished: feature.publishedAt.toISOString() } : {}),
    dateModified: feature.updatedAt.toISOString(),
    author: { "@type": "Organization", name: "おとあつめ", url: siteUrl },
    publisher: {
      "@type": "Organization",
      name: "おとあつめ",
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") }
    },
    ...(firstThumbnail ? { image: firstThumbnail } : {}),
    description: buildDescription(feature.lead)
  };

  return (
    <div className="flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb
        items={[
          { name: "ホーム", href: "/" },
          { name: "特集", href: "/features" },
          { name: feature.title, href: `/features/${feature.slug}` }
        ]}
      />

      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="eyebrow tracking-[0.22em]">staff pick</p>
          <h1 className="text-3xl font-bold leading-[1.25] tracking-[-0.01em] text-ink sm:text-[38px]">
            {feature.title}
          </h1>
          {feature.publishedAt ? (
            <p className="font-mono text-xs tabular-nums text-[color:var(--slate-light)]">
              {formatDate(feature.publishedAt)}
            </p>
          ) : null}
          <Prose text={feature.lead} className="mt-1 text-[15px] leading-[1.9] text-slate" />
        </header>

        <div className="flex flex-col gap-7">
          {feature.items.map((item) => (
            <FeatureItemBlock key={item.id} item={item} />
          ))}
        </div>

        {feature.outro ? (
          <div className="border-t border-rule pt-6">
            <Prose text={feature.outro} className="text-[15px] leading-[1.9] text-slate" />
          </div>
        ) : null}

        {links.length > 0 ? (
          <section className="rounded-[3px] border border-rule bg-panel p-5 shadow-lift">
            <h2 className="text-sm font-bold tracking-[0.02em] text-ink">関連リンク</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {links.map((link, index) => (
                <li key={index} className="min-w-0">
                  <FeatureLinkRow url={link.url} label={link.label} note={link.note} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {coverIds.length > 0 ? (
          <div className="flex flex-col items-start gap-2 border-t border-rule pt-6">
            <p className="text-[13px] text-slate">
              この特集で紹介した歌唱記録を、まとめて試聴機のかごに入れられます。
            </p>
            <AddToBasketButton
              coverIds={coverIds}
              matchMode="all"
              variant="button"
              label={`この${coverIds.length}枚をかごに入れる`}
              addedLabel={`この${coverIds.length}枚をかごから出す`}
            />
          </div>
        ) : null}
      </article>
    </div>
  );
}

// 各曲ブロック。ブロック全体を /covers/[coverId] へのリンクにする（YouTube へは飛ばさない）。
function FeatureItemBlock({ item }: { item: FeaturePublicDetail["items"][number] }) {
  const cover = item.cover;
  const thumbnail = itemThumbnail(item);
  const performerNames = cover.performers.map(({ performer }) => performer.name).join(", ");
  const artistNames = cover.song.artists.map(({ artist }) => artist.name).join(", ");

  return (
    <section className="flex flex-col gap-3.5">
      <Link
        href={`/covers/${cover.id}`}
        className="group grid gap-4 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start sm:gap-6"
      >
        {/* sm 未満は縦積み。ジャケットは幅いっぱいにせず max-w-[180px] で左寄せ。 */}
        <div className="w-[180px] max-w-full sm:w-[200px]">
          <CoverJacket
            src={thumbnail}
            alt={`${cover.song.title} のサムネイル`}
            coverType={cover.coverType}
            plain
            sizes="200px"
            iconClassName="size-9"
          />
        </div>

        <div className="min-w-0">
          {/* 文字サイズの階層: 楽曲名 > 歌唱者名 > 原曲アーティスト。 */}
          <h2 className="text-2xl font-bold leading-[1.3] tracking-[-0.01em] text-ink underline-offset-4 group-hover:underline">
            {cover.song.title}
          </h2>
          {performerNames ? (
            <p className="mt-1.5 text-base font-bold text-slate">{performerNames}</p>
          ) : null}
          {artistNames ? (
            <p className="mt-1 text-xs text-[color:var(--slate-light)]">原曲 {artistNames}</p>
          ) : null}
        </div>
      </Link>

      <Prose text={item.comment} className="text-[15px] leading-[1.95] text-ink" />
    </section>
  );
}

function FeatureLinkRow({ url, label, note }: { url: string; label: string; note?: string }) {
  const external = /^https?:\/\//i.test(url);
  const className =
    "inline-flex items-center gap-1.5 text-[14px] font-bold text-stamp underline-offset-4 hover:underline";

  return (
    <div className="flex flex-col gap-0.5">
      {external ? (
        <a href={url} target="_blank" rel="noreferrer" className={className}>
          {label}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : (
        <Link href={url} className={className}>
          {label}
        </Link>
      )}
      {note ? <span className="text-[13px] text-slate">{note}</span> : null}
    </div>
  );
}

// プレーンテキストの改行を段落に変換して描画する（Markdown パーサは使わない）。
function Prose({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? "mt-4" : undefined}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}
