import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Music2 } from "lucide-react";

import { AddToBasketButton } from "@/components/basket/add-to-basket-button";
import { Breadcrumb } from "@/components/breadcrumb";
import { CoverJacket } from "@/components/covers/cover-jacket";
import { CoverList } from "@/components/covers/cover-list";
import { LatestCoversFallback } from "@/components/covers/latest-covers-fallback";
import { SetlistDisclosure } from "@/components/covers/setlist-disclosure";
import { PerformerColorChip } from "@/components/performers/performer-color-chip";
import { ShareButton } from "@/components/share-button";
import { buttonVariants } from "@/components/ui/button";
import { buildObiText } from "@/lib/covers/obi";
import { clampPerformerColor } from "@/lib/performer-color";
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
      title: "歌唱記録が見つかりません"
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

  // 収録曲（TRACKS）はこの情報元に紐づく全曲。getOtherCoversBySourceVideoId は
  // 表示中の記録を除外して返すので、自分自身を差し戻してタイムスタンプ順に並べ直す。
  // ライナーノーツは「この一枚に何が入っているか」を通しで見せる面なので、
  // 表示中の曲も1トラックとして列に並ぶ（従来の「他の歌唱記録」より情報が増える）。
  const trackEntries = [
    {
      id: cover.id,
      title: cover.song.title,
      artists: cover.song.artists.map(({ artist }) => artist.name).join(", "),
      performerNames: performers.map((performer) => performer.name).join(", "),
      timestampSeconds: cover.timestampSeconds,
      isCurrent: true
    },
    ...sameSourceCovers.map((sourceCover) => ({
      id: sourceCover.id,
      title: sourceCover.song.title,
      artists: sourceCover.song.artists.map(({ artist }) => artist.name).join(", "),
      performerNames: sourceCover.performers.map(({ performer }) => performer.name).join(", "),
      timestampSeconds: sourceCover.timestampSeconds,
      isCurrent: false
    }))
  ].sort((a, b) => {
    // タイムスタンプ未設定は末尾へ（DB 側の nulls: "last" と同じ扱い）。
    if (a.timestampSeconds == null) {
      return b.timestampSeconds == null ? 0 : 1;
    }
    if (b.timestampSeconds == null) {
      return -1;
    }
    return a.timestampSeconds - b.timestampSeconds;
  });
  const isAlbum = trackEntries.length > 1;
  const obiText = buildObiText({
    trackCount: trackEntries.length,
    coverType: cover.coverType,
    performedAt: cover.performedAt
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb
        items={[
          { name: "店頭", href: "/" },
          { name: "棚", href: "/covers" },
          { name: cover.song.title, href: `/covers/${cover.id}` }
        ]}
      />

      {created ? (
        <div className="flex flex-col gap-3 rounded-[2px] border border-dashed border-wood-dark bg-kraft p-4 text-sm font-bold text-kraft-ink sm:flex-row sm:items-center sm:justify-between">
          <span>歌唱記録を登録しました。</span>
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
        <div className="rounded-[2px] border border-dashed border-wood-dark bg-kraft p-4 text-sm font-bold text-kraft-ink">
          通報を受け付けました。
        </div>
      ) : null}

      {/* ライナーノーツ本体。上辺の太い線が綴じ側で、活動者カラーがあればそれを使う。 */}
      <article
        className="rounded-[2px] border border-rule bg-panel p-5 shadow-lift sm:px-9 sm:pb-7 sm:pt-8"
        style={{ borderTopWidth: 4, borderTopColor: accentColor ?? "var(--stamp)" }}
      >
        <div className="grid items-start gap-6 border-b-2 border-ink pb-6 lg:grid-cols-[minmax(0,1fr)_210px] lg:gap-[34px]">
          <div className="min-w-0">
            <p className="eyebrow tracking-[0.26em]">liner notes</p>
            <h1 className="mt-3.5 text-3xl font-bold leading-[1.18] tracking-[-0.015em] text-ink sm:text-[40px]">
              {cover.song.title}
            </h1>
            <p className="mt-3.5 text-[15px] leading-[1.7] text-slate">
              原曲 <span className="font-bold text-ink">{artists}</span>
            </p>

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
          </div>

          {/* 一枚のジャケット。クリックで情報元へ飛ぶ導線も兼ねる。 */}
          <a
            href={sourceUrlWithTimestamp}
            target="_blank"
            rel="noreferrer"
            aria-label="情報元を開く"
            className="mx-auto block w-[210px] max-w-full rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:mx-0"
          >
            <CoverJacket
              src={thumbnailUrl}
              alt={`${cover.song.title} のサムネイル`}
              coverType={cover.coverType}
              obiText={obiText}
              obiColor={accentColor ?? undefined}
              sizes="210px"
              priority
              iconClassName="size-10"
            />
          </a>
        </div>

        {/* 値がある項目だけを枠ごと表示し、残りの項目で自然に詰める。 */}
        <dl className="grid grid-cols-2 border-b border-rule sm:grid-cols-4">
          <MetaCell label="date" value={formatDate(cover.performedAt)} mono />
          <MetaCell label="type" value={coverTypeLabel(cover.coverType)} />
          {hasTimestamp ? (
            <MetaCell label="timestamp" value={formatSeconds(cover.timestampSeconds)} mono />
          ) : null}
          <MetaCell label="tracks" value={String(trackEntries.length).padStart(2, "0")} mono />
          <MetaCell
            label="source"
            mono
            value={
              <a
                href={sourceUrlWithTimestamp}
                target="_blank"
                rel="noreferrer"
                className="text-stamp underline-offset-4 hover:underline"
              >
                {sourceHostLabel(cover.sourceUrl)}
              </a>
            }
          />
        </dl>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-[38px]">
          <section className="min-w-0">
            <h2 className="border-b border-board pb-[7px] text-[15px] font-bold tracking-[0.02em] text-ink">
              収録曲 / TRACKS
            </h2>
            <SetlistDisclosure initialCount={8}>
              {trackEntries.map((track, index) => (
                <div
                  key={track.id}
                  className={cn(
                    "grid grid-cols-[30px_minmax(0,1fr)_66px] items-baseline gap-3 px-3 py-2.5",
                    track.isCurrent && "bg-hover"
                  )}
                >
                  <span className="font-mono text-xs tabular-nums text-[color:var(--slate-light)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    {track.isCurrent ? (
                      <span aria-current="true" className="text-[15px] font-bold text-ink">
                        {track.title}
                      </span>
                    ) : (
                      <Link
                        href={`/covers/${track.id}`}
                        className="text-[15px] font-bold text-ink underline-offset-4 hover:text-stamp hover:underline"
                      >
                        {track.title}
                      </Link>
                    )}
                    <span className="mt-0.5 block truncate text-xs text-[color:var(--slate-light)]">
                      {[track.artists, track.performerNames].filter(Boolean).join(" ／ ")}
                    </span>
                  </span>
                  <span className="text-right font-mono text-xs tabular-nums text-slate">
                    {track.timestampSeconds != null ? formatSeconds(track.timestampSeconds) : "-"}
                  </span>
                </div>
              ))}
            </SetlistDisclosure>
            <p className="mt-3.5 text-[13px] leading-[1.95] text-slate">
              {isAlbum
                ? "この一枚は、1本の配信アーカイブに複数曲が紐づいた記録です。曲ごとのタイムスタンプはユーザが登録したもので、情報元を開くとその位置から再生されます。収録曲はそれぞれ独立した歌唱記録として棚にも並んでいます。"
                : "この一枚には1曲が紐づいています。情報元を開くと、登録されたタイムスタンプの位置から再生されます。"}
            </p>
          </section>

          <aside className="flex min-w-0 flex-col gap-6">
            <div>
              <h2 className="border-b border-board pb-[7px] text-[13px] font-bold tracking-[0.02em] text-ink">
                情報元 / SOURCE
              </h2>
              {sourceTitle ? (
                <p className="mt-2.5 text-[13px] leading-[1.8] text-slate">{sourceTitle}</p>
              ) : null}
              <div className="mt-3 flex flex-col gap-[7px]">
                <a
                  href={sourceUrlWithTimestamp}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants(), "h-[42px] w-full")}
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  情報元で聴く
                </a>
                {/* ShareButton は display:contents なので、各ボタンがこのグリッドの
                    セルとして 2 列に並ぶ。 */}
                <div className="grid grid-cols-2 gap-[7px] [&_a]:h-9 [&_a]:text-xs [&_button]:h-9 [&_button]:text-xs">
                  <ShareButton
                    url={`${siteUrl}/covers/${cover.id}`}
                    title={`${cover.song.title} / ${performers.map((performer) => performer.name).join(", ")} | おとあつめ`}
                  />
                </div>
                <Link
                  href={`/covers/${cover.id}/report`}
                  className="inline-flex h-8 items-center justify-center text-xs text-slate underline-offset-4 hover:text-ink hover:underline"
                >
                  記載内容を通報する
                </Link>
              </div>
            </div>

            {otherSongCovers.length > 0 ? (
              <div>
                <h2 className="border-b border-board pb-[7px] text-[13px] font-bold tracking-[0.02em] text-ink">
                  同じ曲の一枚 / RELATED
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {otherSongCovers.slice(0, 4).map((related) => (
                    <RelatedSpineRow key={related.id} cover={related} />
                  ))}
                </div>
                <Link
                  href={`/songs/${cover.songId}`}
                  className="mt-3 inline-flex text-[13px] font-bold text-stamp underline-offset-4 hover:underline"
                >
                  楽曲ページを見る →
                </Link>
              </div>
            ) : null}

            {/* CDかご。歌唱記録（曲）を集めるのはこちら。まだ無いものを待つ入荷ベルは
                楽曲ページ側に置いており、ここには出さない。 */}
            <div className="rounded-[2px] border border-dashed border-wood-dark bg-panel p-3.5">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-wood-dark">
                cd basket
              </p>
              <p className="mt-2 text-xs leading-[1.8] text-slate">
                かごに入れると、あとで1曲ずつ試聴したりYouTubeでまとめて聴けます。
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <AddToBasketButton
                  coverIds={[cover.id]}
                  label="この曲をかごに入れる"
                  variant="button"
                  className="w-full"
                />
                {isAlbum && cover.sourceVideoId ? (
                  <AddToBasketButton
                    coverIds={trackEntries.map((track) => track.id)}
                    label={`この配信の全${trackEntries.length}曲をかごに入れる`}
                    addedLabel={`この配信の全${trackEntries.length}曲をかごから出す`}
                    matchMode="all"
                    variant="button"
                    className="w-full border border-rule bg-panel text-ink shadow-none hover:bg-hover"
                  />
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </article>

      {otherPerformerCovers.length > 0 ? (
        <RelatedCoversSection
          eyebrow="same performer"
          title="同じ活動者の他の歌唱記録"
          description="この記録の活動者による他の歌唱記録です。"
          covers={otherPerformerCovers}
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

// ライナーノーツのメタ4分割。値の無い項目は呼び出し側で落とす。
function MetaCell({
  label,
  value,
  mono = false
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 border-l border-rule px-4 py-3.5 first:border-l-0 sm:first:border-l">
      <dt className="kv-label">{label}</dt>
      <dd className={cn("mt-1.5 truncate text-sm text-ink", mono && "font-mono tabular-nums")}>
        {value}
      </dd>
    </div>
  );
}

// サイドバーの関連。左に活動者カラーの背表紙を立てる。
function RelatedSpineRow({ cover }: { cover: CoverListItem }) {
  const spineColor = clampPerformerColor(
    cover.performers.find(({ performer }) => performer.colorCode)?.performer.colorCode
  );

  return (
    <Link
      href={`/covers/${cover.id}`}
      className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2.5 text-ink"
    >
      <span
        aria-hidden="true"
        className="h-[30px] w-[18px] rounded-[1px] shadow-spine"
        style={{ backgroundColor: spineColor ?? "var(--slate-light)" }}
      />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold underline-offset-4 hover:underline">
          {cover.song.title}
        </span>
        <span className="block truncate font-mono text-[10px] text-[color:var(--slate-light)]">
          {cover.performers.map(({ performer }) => performer.name).join(", ")}
        </span>
      </span>
    </Link>
  );
}

function RelatedCoversSection({
  eyebrow,
  title,
  description,
  covers,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  covers: CoverListItem[];
  action?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow-muted">{eyebrow}</p>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink">{title}</h2>
          <p className="mt-1 text-[13px] text-slate">{description}</p>
        </div>
        {action}
      </div>

      <CoverList covers={covers} />
    </section>
  );
}

// 情報元URLのホスト名を安全に取り出す（表示用）。
function sourceHostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "情報元";
  }
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
