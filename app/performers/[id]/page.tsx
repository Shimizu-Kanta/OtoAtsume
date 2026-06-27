import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { coverTypeLabel } from "@/lib/constants";
import { getPerformerById } from "@/lib/data/performers";
import { formatDate, formatDateInput } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerformerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const performer = await getPerformerById(id);

  if (!performer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title={performer.name}
        description={performer.group?.name ?? "所属グループなし"}
      />

      <section className="rounded-md border bg-card">
        <dl className="divide-y">
          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">カラー</dt>
            <dd className="md:col-span-3">
              {performer.colorCode ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-4 rounded-sm border"
                    style={{ backgroundColor: performer.colorCode }}
                  />
                  {performer.colorCode}
                </span>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">デビュー日</dt>
            <dd className="md:col-span-3">
              {performer.debutDate ? formatDateInput(performer.debutDate) : "-"}
            </dd>
          </div>
          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">タグ</dt>
            <dd className="md:col-span-3">
              {performer.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {performer.tags.map(({ tag }) => (
                    <Badge key={tag.id} variant="muted">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">YouTube URL</dt>
            <dd className="min-w-0 md:col-span-3">
              {performer.youtubeUrl ? (
                <a href={performer.youtubeUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                  {performer.youtubeUrl}
                </a>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">公式URL</dt>
            <dd className="min-w-0 md:col-span-3">
              {performer.officialUrl ? (
                <a href={performer.officialUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                  {performer.officialUrl}
                </a>
              ) : (
                "-"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">歌唱履歴</h2>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="divide-y">
            {performer.covers.map(({ cover }) => (
              <div key={cover.id} className="p-4">
                <Link href={`/covers/${cover.id}`} className="font-medium text-primary underline">
                  {cover.song.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {cover.song.artists.map(({ artist }) => artist.name).join(", ")} /{" "}
                  {formatDate(cover.performedAt)}
                </p>
                <Badge variant="muted" className="mt-2">
                  {coverTypeLabel(cover.coverType)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
