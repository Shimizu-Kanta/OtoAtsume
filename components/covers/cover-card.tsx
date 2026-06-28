import Link from "next/link";
import { Play } from "lucide-react";

import { PerformerColorChip } from "@/components/performers/performer-color-chip";
import { Badge } from "@/components/ui/badge";
import { coverTypeLabel } from "@/lib/constants";
import type { CoverListItem } from "@/lib/data/covers";
import { formatDate } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

function artistNames(cover: CoverListItem) {
  return cover.song.artists.map(({ artist }) => artist.name).join(", ");
}

export function CoverCard({ cover }: { cover: CoverListItem }) {
  const thumbnailUrl = getYouTubeThumbnailUrl(cover.sourceUrl);
  const title = cover.song.title;
  const sourceLabel = cover.sourceTitle ?? cover.sourceUrl;

  return (
    <Link
      href={`/covers/${cover.id}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-md border bg-card transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-video w-full overflow-hidden bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${title} のサムネイル`}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Play className="size-9" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold leading-6">{title}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{artistNames(cover)}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <p className="mb-1 text-muted-foreground">歌唱</p>
            <div className="flex flex-wrap gap-1.5">
              {cover.performers.map(({ performer }) => (
                <PerformerColorChip
                  key={performer.id}
                  name={performer.name}
                  colorCode={performer.colorCode}
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">日付: {formatDate(cover.performedAt)}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Badge variant="muted">{coverTypeLabel(cover.coverType)}</Badge>
          <span className="ml-auto text-sm text-primary underline-offset-4 group-hover:underline">
            詳細
          </span>
        </div>

        <p className="truncate border-t pt-3 text-xs text-muted-foreground">{sourceLabel}</p>
      </div>
    </Link>
  );
}