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
      <section
        className="overflow-hidden rounded-md border bg-card"
        style={{
          borderTopColor: performer.colorCode ?? undefined,
          borderTopWidth: performer.colorCode ? 4 : undefined
        }}
      >
        <div
          className="p-5"
          style={{
            background: performer.colorCode
              ? `linear-gradient(135deg, ${performer.colorCode}1A, transparent 55%)`
              : undefined
          }}
        >
          <PageHeading
            title={performer.name}
            description={performer.group?.name ?? "所属グループなし"}
            actions={
              performer.colorCode ? (
                <span className="inline-flex items-center gap-2 rounded-sm border bg-background px-3 py-2 text-sm text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-full border"
                    style={{ backgroundColor: performer.colorCode }}
                  />
                  {performer.colorCode}
                </span>
              ) : null
            }
          />
        </div>
      </section>

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
            <dt className="text-sm text-muted-foreground">誕生日</dt>
            <dd className="md:col-span-3">
              {performer.birthday ? formatBirthdayInput(performer.birthday) : "-"}
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
        <div className="flex items-center gap-2">
          {performer.colorCode ? (
            <span
              aria-hidden="true"
              className="size-3 rounded-full border"
              style={{ backgroundColor: performer.colorCode }}
            />
          ) : null}
          <h2 className="text-lg font-semibold">歌唱履歴</h2>
        </div>

        <div className="overflow-hidden rounded-md border bg-card">
          {performer.covers.length > 0 ? (
            <div className="divide-y">
              {performer.covers.map(({ cover }) => (
                <div
                  key={cover.id}
                  className="border-l-4 p-4 transition-colors hover:bg-muted/40"
                  style={{ borderLeftColor: performer.colorCode ?? "transparent" }}
                >
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
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              この活動者の歌唱履歴はまだ登録されていません。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function formatBirthdayInput(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${month}-${day}`;
}