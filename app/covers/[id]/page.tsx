import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { PerformerColorChip } from "@/components/performers/performer-color-chip";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { coverTypeLabel } from "@/lib/constants";
import { getCoverById } from "@/lib/data/covers";
import { cn, formatDate, formatSeconds, withTimestamp } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function CoverDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const cover = await getCoverById(id);

  if (!cover) {
    notFound();
  }

  const artists = cover.song.artists.map(({ artist }) => artist.name).join(", ");
  const performers = cover.performers.map(({ performer }) => performer);
  const accentColor = performers.find((performer) => performer.colorCode)?.colorCode;
  const created = query.created === "1";
  const reported = query.reported === "1";
  const thumbnailUrl = getYouTubeThumbnailUrl(cover.sourceUrl);
  const sourceTitle = cover.sourceTitle?.trim();
  const hasTimestamp = cover.timestampSeconds != null;

  return (
    <div className="space-y-6">
      <PageHeading
        title={cover.song.title}
        description={artists}
        actions={
          <Link
            href={`/covers/${cover.id}/report`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            通報
          </Link>
        }
      />

      {created ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          カバー記録を登録しました。
        </div>
      ) : null}
      {reported ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          通報を受け付けました。
        </div>
      ) : null}

      <section
        className="overflow-hidden rounded-md border border-t-4 bg-card"
        style={{
          borderTopColor: accentColor ?? "transparent",
          backgroundImage: accentColor ? `linear-gradient(135deg, ${accentColor}10, transparent 38%)` : undefined
        }}
      >
        {thumbnailUrl ? (
          <a
            href={withTimestamp(cover.sourceUrl, cover.timestampSeconds)}
            target="_blank"
            rel="noreferrer"
            className="block border-b bg-muted"
            style={{
              backgroundImage: accentColor ? `linear-gradient(135deg, ${accentColor}24, transparent 58%)` : undefined
            }}
          >
            <img
              src={thumbnailUrl}
              alt={`${cover.song.title} のサムネイル`}
              className="aspect-video max-h-[420px] w-full object-contain p-2 sm:p-4"
            />
          </a>
        ) : null}
        <dl className="divide-y">
          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">活動者</dt>
            <dd className="md:col-span-3">
              <div className="flex flex-wrap gap-2">
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
            </dd>
          </div>

          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">歌唱日</dt>
            <dd className="md:col-span-3">{formatDate(cover.performedAt)}</dd>
          </div>

          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">歌唱種別</dt>
            <dd className="md:col-span-3">
              <Badge variant="muted">{coverTypeLabel(cover.coverType)}</Badge>
            </dd>
          </div>

          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">情報元URL</dt>
            <dd className="min-w-0 md:col-span-3">
              <a
                href={withTimestamp(cover.sourceUrl, cover.timestampSeconds)}
                target="_blank"
                rel="noreferrer"
                className="break-all text-primary underline"
              >
                {cover.sourceUrl}
              </a>
            </dd>
          </div>

          {sourceTitle ? (
            <div className="grid gap-1 p-4 md:grid-cols-4">
              <dt className="text-sm text-muted-foreground">配信・動画・ライブ名</dt>
              <dd className="md:col-span-3">{sourceTitle}</dd>
            </div>
          ) : null}

          {hasTimestamp ? (
            <div className="grid gap-1 p-4 md:grid-cols-4">
              <dt className="text-sm text-muted-foreground">タイムスタンプ</dt>
              <dd className="md:col-span-3">{formatSeconds(cover.timestampSeconds)}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
