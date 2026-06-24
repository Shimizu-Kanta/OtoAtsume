import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { coverTypeLabel } from "@/lib/constants";
import { getSongById } from "@/lib/data/songs";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await getSongById(id);

  if (!song) {
    notFound();
  }

  const artists = song.artists.map(({ artist }) => artist.name).join(", ");

  return (
    <div className="space-y-6">
      <PageHeading title={song.title} description={artists} />

      <section className="rounded-md border bg-card">
        <dl className="divide-y">
          <div className="grid gap-1 p-4 md:grid-cols-4">
            <dt className="text-sm text-muted-foreground">原曲URL</dt>
            <dd className="min-w-0 md:col-span-3">
              {song.originalUrl ? (
                <a href={song.originalUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                  {song.originalUrl}
                </a>
              ) : (
                "-"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">この曲を歌った活動者</h2>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="divide-y">
            {song.covers.map((cover) => (
              <div key={cover.id} className="p-4">
                <Link href={`/covers/${cover.id}`} className="font-medium text-primary underline">
                  {cover.performers.map(({ performer }) => performer.name).join(", ")}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(cover.performedAt)}</p>
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
