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
  const thumbnailUrl = cover.sourceImageUrl ?? getYouTubeThumbnailUrl(cover.sourceUrl);
  const title = cover.song.title;
  const sourceLabel = cover.sourceTitle ?? cover.sourceUrl;
  const accentColor = cover.performers.find(({ performer }) => performer.colorCode)?.performer.colorCode;

  return (
    <Link
      href={`/covers/${cover.id}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{
        borderTopColor: accentColor ?? undefined,
        borderTopWidth: accentColor ? 4 : undefined,
        backgroundImage: accentColor ? `linear-gradient(135deg, ${accentColor}12, transparent 46%)` : undefined
      }}
    >
      <div
        className="relative aspect-video w-full overflow-hidden bg-muted"
        style={{
          backgroundImage: accentColor ? `linear-gradient(135deg, ${accentColor}24, transparent 62%)` : undefined
        }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${title} のサムネイル`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Play className="size-9" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-foreground/5 to-transparent opacity-80" />
        <span className="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-card/90 text-primary shadow-sm transition-transform group-hover:scale-105">
          <Play className="ml-0.5 size-4" aria-hidden="true" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-bold leading-6 text-foreground">{title}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{artistNames(cover)}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Singer
            </p>
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
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
          <Badge variant="muted">{coverTypeLabel(cover.coverType)}</Badge>
          <span className="text-xs text-muted-foreground">{formatDate(cover.performedAt)}</span>
          <span className="ml-auto text-sm font-semibold text-primary">詳細</span>
        </div>

        <p className="truncate text-xs text-muted-foreground/80">{sourceLabel}</p>
      </div>
    </Link>
  );
}
