import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { coverTypeLabel } from "@/lib/constants";
import type { CoverListItem } from "@/lib/data/covers";
import { cn, formatDate, withTimestamp } from "@/lib/utils";

function artistNames(cover: CoverListItem) {
  return cover.song.artists.map(({ artist }) => artist.name).join(", ");
}

function performerNames(cover: CoverListItem) {
  return cover.performers.map(({ performer }) => performer.name).join(", ");
}

export function CoverList({ covers }: { covers: CoverListItem[] }) {
  if (covers.length === 0) {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        条件に一致するカバー記録はありません。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="divide-y">
        {covers.map((cover) => (
          <div key={cover.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <Link href={`/covers/${cover.id}`} className="font-medium underline-offset-4 hover:underline">
                {cover.song.title}
              </Link>
              <div className="mt-1 text-sm text-muted-foreground">{artistNames(cover)}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span>歌唱: {performerNames(cover)}</span>
                <span className="text-muted-foreground">日付: {formatDate(cover.performedAt)}</span>
                <Badge variant="muted">{coverTypeLabel(cover.coverType)}</Badge>
              </div>
              <a
                href={withTimestamp(cover.sourceUrl, cover.timestampSeconds)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block truncate text-sm text-primary underline"
              >
                {cover.sourceUrl}
              </a>
            </div>
            <Link
              href={`/covers/${cover.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
            >
              詳細
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
