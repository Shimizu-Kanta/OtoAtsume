import Link from "next/link";
import { notFound } from "next/navigation";
import { Cake, CalendarDays, ExternalLink, Music2, Palette, Tag, Youtube } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { coverTypeLabel } from "@/lib/constants";
import { getPerformerById } from "@/lib/data/performers";
import { cn, formatDate, formatDateInput } from "@/lib/utils";

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
        className="overflow-hidden rounded-[2rem] border border-primary/10 bg-card/90 shadow-sm"
        style={{
          borderTopColor: performer.colorCode ?? undefined,
          borderTopWidth: performer.colorCode ? 5 : undefined,
          backgroundImage: performer.colorCode
            ? `linear-gradient(135deg, ${performer.colorCode}1F, transparent 48%)`
            : undefined
        }}
      >
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[0.24em] text-primary">PERFORMER</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {performer.name}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {performer.group?.name ?? "所属グループなし"} / 歌唱履歴 {performer.covers.length} 件
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {performer.youtubeUrl ? (
                <a
                  href={performer.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Youtube className="size-4" aria-hidden="true" />
                  YouTube
                </a>
              ) : null}
              {performer.officialUrl ? (
                <a
                  href={performer.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  公式URL
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight">プロフィール</h2>
          <dl className="mt-4 space-y-4">
            <InfoItem
              icon={<Palette className="size-4" aria-hidden="true" />}
              label="カラー"
              value={
                performer.colorCode ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-5 rounded-full border shadow-sm"
                      style={{ backgroundColor: performer.colorCode }}
                    />
                    <span>{performer.colorCode}</span>
                  </span>
                ) : (
                  "-"
                )
              }
            />
            <InfoItem
              icon={<CalendarDays className="size-4" aria-hidden="true" />}
              label="デビュー日"
              value={performer.debutDate ? formatDateInput(performer.debutDate) : "-"}
            />
            <InfoItem
              icon={<Cake className="size-4" aria-hidden="true" />}
              label="誕生日"
              value={performer.birthday ? formatBirthdayInput(performer.birthday) : "-"}
            />
            <InfoItem
              icon={<Tag className="size-4" aria-hidden="true" />}
              label="タグ"
              value={
                performer.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {performer.tags.map(({ tag }) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "-"
                )
              }
            />
          </dl>
        </div>

        <div className="rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight">リンク</h2>
          <div className="mt-4 space-y-3">
            <ExternalLinkRow label="YouTube URL" href={performer.youtubeUrl} />
            <ExternalLinkRow label="公式URL" href={performer.officialUrl} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Music2 className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">歌唱履歴</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                この活動者に紐づく公開済みのカバー記録です。
              </p>
            </div>
          </div>
          <Badge variant="default">{performer.covers.length}件</Badge>
        </div>

        <div className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm">
          {performer.covers.length > 0 ? (
            <div className="divide-y">
              {performer.covers.map(({ cover }) => (
                <div
                  key={cover.id}
                  className="p-4 transition-colors hover:bg-primary/5"
                  style={{
                    borderLeftColor: performer.colorCode ?? "transparent",
                    borderLeftWidth: performer.colorCode ? 4 : undefined
                  }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/covers/${cover.id}`}
                        className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {cover.song.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {cover.song.artists.map(({ artist }) => artist.name).join(", ")} / {formatDate(cover.performedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{coverTypeLabel(cover.coverType)}</Badge>
                      <Link
                        href={`/covers/${cover.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        詳細
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              この活動者の歌唱履歴はまだ登録されていません。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
      <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function ExternalLinkRow({ label, href }: { label: string; href?: string | null }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block break-all text-sm text-primary underline-offset-4 hover:underline"
        >
          {href}
        </a>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">未登録</p>
      )}
    </div>
  );
}

function formatBirthdayInput(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${month}-${day}`;
}
