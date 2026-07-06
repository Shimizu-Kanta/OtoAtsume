import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Disc3, ExternalLink, Music2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { coverTypeLabel } from "@/lib/constants";
import { getSongById } from "@/lib/data/songs";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await getSongById(id);

  if (!song) {
    notFound();
  }

  const artists = song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-primary/10 bg-card/90 shadow-sm">
        <div className="bg-primary/10 p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[0.24em] text-primary">SONG</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {song.title}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">{artists}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {song.originalUrl ? (
                <a
                  href={song.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  原曲URL
                </a>
              ) : null}
              <Link href={`/covers?song=${encodeURIComponent(song.title)}`} className={cn(buttonVariants())}>
                <Music2 className="size-4" aria-hidden="true" />
                カバー記録を探す
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={<Disc3 className="size-4" aria-hidden="true" />}
          label="楽曲"
          value={song.title}
        />
        <InfoCard
          icon={<Users className="size-4" aria-hidden="true" />}
          label="原曲アーティスト"
          value={artists}
        />
        <InfoCard
          icon={<Music2 className="size-4" aria-hidden="true" />}
          label="カバー記録"
          value={`${song.covers.length.toLocaleString("ja-JP")} 件`}
        />
      </section>

      <section className="rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
        <h2 className="text-lg font-bold tracking-tight">原曲リンク</h2>
        <div className="mt-4 rounded-2xl border bg-background/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Original URL</p>
          {song.originalUrl ? (
            <a
              href={song.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-sm text-primary underline-offset-4 hover:underline"
            >
              {song.originalUrl}
            </a>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">未登録</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Music2 className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">この曲を歌った活動者</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                この楽曲に紐づく公開済みのカバー記録です。
              </p>
            </div>
          </div>
          <Badge variant="default">{song.covers.length}件</Badge>
        </div>

        <div className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm">
          {song.covers.length > 0 ? (
            <div className="divide-y">
              {song.covers.map((cover) => (
                <div key={cover.id} className="p-4 transition-colors hover:bg-primary/5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {cover.performers.map(({ performer }) => (
                          <Link
                            key={performer.id}
                            href={`/performers/${performer.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            {performer.name}
                          </Link>
                        ))}
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-4" aria-hidden="true" />
                          {formatDate(cover.performedAt)}
                        </span>
                        {cover.performers.some(({ performer }) => performer.group) ? (
                          <span>
                            {cover.performers
                              .map(({ performer }) => performer.group?.name)
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        ) : null}
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
              この曲のカバー記録はまだ登録されていません。
            </p>
          )}
        </div>
      </section>
    </div>
  );
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
      <p className="mt-4 line-clamp-2 text-lg font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
