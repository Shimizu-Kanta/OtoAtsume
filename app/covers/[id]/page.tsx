import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, Flag, Music2, Play, Radio, Timer, Users } from "lucide-react";

import { Breadcrumb } from "@/components/breadcrumb";
import { CoverCard } from "@/components/covers/cover-card";
import { CoverThumbnail } from "@/components/covers/cover-thumbnail";
import { LatestCoversFallback } from "@/components/covers/latest-covers-fallback";
import { CoverCarousel } from "@/components/home/cover-carousel";
import { PerformerColorChip } from "@/components/performers/performer-color-chip";
import { ShareButton } from "@/components/share-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { coverTypeLabel } from "@/lib/constants";
import {
  getCoverById,
  getCoverRelationCounts,
  getOtherCoversByPerformers,
  getOtherCoversBySong,
  getOtherCoversBySourceVideoId,
  type CoverListItem
} from "@/lib/data/covers";
import { evaluateCoverQuality } from "@/lib/content-quality";
import { cn, formatDate, formatDateInput, formatSeconds, withTimestamp } from "@/lib/utils";
import { absoluteUrl, siteUrl } from "@/lib/site-url";
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "@/lib/youtube";
import type { Metadata } from "next";

export const revalidate = 3600;

type CoverDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cover = await getCoverById(id);

  if (!cover) {
    return {
      title: "カバー記録が見つかりません"
    };
  }

  const artists = cover.song.artists.map(({ artist }) => artist.name).join(", ");
  const performers = cover.performers.map(({ performer }) => performer.name).join(", ");
  const title = `${cover.song.title} / ${performers}`;
  const description = artists
    ? `${cover.song.title} - ${artists} の歌唱記録です。`
    : `${cover.song.title} の歌唱記録です。`;

  const relationCounts = await getCoverRelationCounts(cover);
  const { isIndexable } = evaluateCoverQuality(relationCounts);

  return {
    title,
    description,
    robots: isIndexable ? undefined : { index: false, follow: true },
    alternates: {
      canonical: `/covers/${cover.id}`
    },
    openGraph: {
      type: "article",
      url: `/covers/${cover.id}`,
      siteName: "おとあつめ",
      title,
      description
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default async function CoverDetailPage({ params, searchParams }: CoverDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const cover = await getCoverById(id);

  if (!cover) {
    notFound();
  }

  const artists = cover.song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定";
  const performers = cover.performers.map(({ performer }) => performer);
  const accentColor = performers.find((performer) => performer.colorCode)?.colorCode;
  const created = query.created === "1";
  const reported = query.reported === "1";
  const thumbnailUrl = cover.sourceImageUrl ?? getYouTubeThumbnailUrl(cover.sourceUrl);
  const sourceTitle = cover.sourceTitle?.trim();
  const hasTimestamp = cover.timestampSeconds != null;
  const sourceUrlWithTimestamp = withTimestamp(cover.sourceUrl, cover.timestampSeconds);
  // 同一動画のグルーピングは sourceVideoId で行う（URL 表記揺れに強い）。
  // 保存済みの値を優先し、未設定の古いレコードは sourceUrl から導出する。
  const sourceVideoId = cover.sourceVideoId ?? extractYouTubeVideoId(cover.sourceUrl);

  const [otherPerformerCovers, otherSongCovers, sameSourceCovers] = await Promise.all([
    getOtherCoversByPerformers(
      performers.map((performer) => performer.id),
      cover.id
    ),
    getOtherCoversBySong(cover.songId, cover.id),
    sourceVideoId ? getOtherCoversBySourceVideoId(sourceVideoId, cover.id) : Promise.resolve([])
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: cover.song.title,
    url: absoluteUrl(`/covers/${cover.id}`),
    datePublished: cover.performedAt.toISOString(),
    byArtist: performers.map((performer) => ({
      "@type": "Person",
      name: performer.name
    })),
    ...(cover.song.artists.length > 0
      ? {
          recordingOf: {
            "@type": "MusicComposition",
            name: cover.song.title,
            composer: cover.song.artists.map(({ artist }) => ({
              "@type": "Person",
              name: artist.name
            }))
          }
        }
      : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    sameAs: cover.sourceUrl
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb
        items={[
          { name: "ホーム", href: "/" },
          { name: "カバー記録", href: "/covers" },
          { name: cover.song.title, href: `/covers/${cover.id}` }
        ]}
      />
      {created ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-secondary/40 bg-secondary/20 p-4 text-sm font-medium text-secondary-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>カバー記録を登録しました。</span>
          <Link
            href={buildContinueRegistrationHref(cover)}
            className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
          >
            <Music2 className="size-4" aria-hidden="true" />
            同じ動画から続けて登録
          </Link>
        </div>
      ) : null}
      {reported ? (
        <div className="rounded-3xl border border-secondary/40 bg-secondary/20 p-4 text-sm font-medium text-secondary-foreground shadow-sm">
          通報を受け付けました。
        </div>
      ) : null}

      <section
        className="overflow-hidden rounded-[2rem] border border-primary/10 bg-card/90 shadow-sm"
        style={{
          borderTopColor: accentColor ?? undefined,
          borderTopWidth: accentColor ? 5 : undefined,
          backgroundImage: accentColor ? `linear-gradient(135deg, ${accentColor}1F, transparent 48%)` : undefined
        }}
      >
        <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <a
            href={sourceUrlWithTimestamp}
            target="_blank"
            rel="noreferrer"
            className="group relative block aspect-video overflow-hidden bg-muted"
            style={{
              backgroundImage: accentColor ? `linear-gradient(135deg, ${accentColor}24, transparent 62%)` : undefined
            }}
          >
            <CoverThumbnail
              src={thumbnailUrl}
              alt={`${cover.song.title} のサムネイル`}
              coverType={cover.coverType}
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority
              imageClassName="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              iconClassName="size-12"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-transparent to-transparent" />
            <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-transform group-hover:scale-105">
              <Play className="size-4" aria-hidden="true" />
              情報元を開く
            </span>
          </a>

          <div className="flex flex-col justify-between gap-6 p-5 sm:p-7">
            <div>
              <p className="text-sm font-semibold tracking-[0.24em] text-primary">COVER DETAIL</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {cover.song.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{artists}</p>

              {sourceTitle ? (
                <a
                  href={sourceUrlWithTimestamp}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block rounded-2xl border bg-background/70 p-3 text-sm text-primary underline-offset-4 hover:underline"
                >
                  {sourceTitle}
                </a>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={sourceUrlWithTimestamp} target="_blank" rel="noreferrer" className={cn(buttonVariants())}>
                <ExternalLink className="size-4" aria-hidden="true" />
                情報元URL
              </a>
              <Link href={`/covers/${cover.id}/report`} className={cn(buttonVariants({ variant: "outline" }))}>
                <Flag className="size-4" aria-hidden="true" />
                通報
              </Link>
              <ShareButton
                url={`${siteUrl}/covers/${cover.id}`}
                title={`${cover.song.title} / ${performers.map((performer) => performer.name).join(", ")} | おとあつめ`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={cn("grid gap-4", hasTimestamp ? "md:grid-cols-3" : "md:grid-cols-2")}>
        <InfoCard
          icon={<CalendarDays className="size-4" aria-hidden="true" />}
          label="歌唱日"
          value={formatDate(cover.performedAt)}
        />
        <InfoCard
          icon={<Music2 className="size-4" aria-hidden="true" />}
          label="歌唱種別"
          value={coverTypeLabel(cover.coverType)}
        />
        {hasTimestamp ? (
          <InfoCard
            icon={<Timer className="size-4" aria-hidden="true" />}
            label="タイムスタンプ"
            value={formatSeconds(cover.timestampSeconds)}
          />
        ) : null}
      </section>

      <section className="rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight">歌唱した活動者</h2>
            <p className="mt-1 text-sm text-muted-foreground">この記録に紐づく活動者です。</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {performers.map((performer) => (
            <Link
              key={performer.id}
              href={`/performers/${performer.id}`}
              className="inline-flex max-w-full underline-offset-4 hover:underline"
            >
              <PerformerColorChip
                name={`${performer.name}${performer.group ? ` / ${performer.group.name}` : ""}`}
                colorCode={performer.colorCode}
              />
            </Link>
          ))}
        </div>
      </section>

      {sameSourceCovers.length > 0 ? (
        <section className="rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Radio className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">この配信・ライブの他の歌唱記録</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                上部に表示している配信・ライブから登録されている他の歌唱記録を、タイムスタンプ順のセットリストとして並べています。
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y overflow-hidden rounded-2xl border bg-background/70">
            {sameSourceCovers.map((sourceCover) => {
              const sourceArtists = sourceCover.song.artists
                .map(({ artist }) => artist.name)
                .join(", ");

              return (
                <div key={sourceCover.id} className="flex items-start gap-3 p-3">
                  <Badge variant={sourceCover.timestampSeconds != null ? "outline" : "muted"} className="mt-0.5 shrink-0">
                    <Timer className="mr-1 size-3" aria-hidden="true" />
                    {sourceCover.timestampSeconds != null
                      ? formatSeconds(sourceCover.timestampSeconds)
                      : "-"}
                  </Badge>
                  <div className="min-w-0">
                    <Link
                      href={`/covers/${sourceCover.id}`}
                      className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      {sourceCover.song.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {sourceArtists ? `${sourceArtists} ／ ` : ""}
                      {sourceCover.performers.map(({ performer }) => performer.name).join(", ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {otherPerformerCovers.length > 0 ? (
        <RelatedCoversSection
          title="同じ活動者の他のカバー記録"
          description="この記録の活動者による他のカバー記録です。"
          covers={otherPerformerCovers}
        />
      ) : null}

      {otherSongCovers.length > 0 ? (
        <RelatedCoversSection
          title="同じ楽曲の他のカバー記録"
          description="同じ楽曲を歌った他の活動者のカバー記録です。"
          covers={otherSongCovers}
          action={
            <Link
              href={`/songs/${cover.songId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              楽曲ページを見る
            </Link>
          }
        />
      ) : null}

      {otherPerformerCovers.length === 0 &&
      otherSongCovers.length === 0 &&
      sameSourceCovers.length === 0 ? (
        <LatestCoversFallback excludeCoverId={cover.id} />
      ) : null}
    </div>
  );
}

function RelatedCoversSection({
  title,
  description,
  covers,
  action
}: {
  title: string;
  description: string;
  covers: CoverListItem[];
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Music2 className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>

      <CoverCarousel>
        {covers.map((cover) => (
          <CoverCard key={cover.id} cover={cover} />
        ))}
      </CoverCarousel>
    </section>
  );
}

// 連続登録用リンク。楽曲とタイムスタンプ以外（URL・タイトル・歌唱日・種別・活動者）を引き継ぐ。
function buildContinueRegistrationHref(cover: {
  sourceUrl: string;
  sourceTitle: string | null;
  performedAt: Date;
  coverType: string;
  performers: { performer: { id: string } }[];
}) {
  const params = new URLSearchParams();
  params.set("sourceUrl", cover.sourceUrl);
  if (cover.sourceTitle) {
    params.set("sourceTitle", cover.sourceTitle);
  }
  params.set("performedAt", formatDateInput(cover.performedAt));
  params.set("coverType", cover.coverType);
  for (const { performer } of cover.performers) {
    params.append("performerIds", performer.id);
  }
  return `/covers/new?${params.toString()}`;
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-4 text-lg font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
