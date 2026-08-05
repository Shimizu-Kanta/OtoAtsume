import Link from "next/link";

import { CoverThumbnail } from "@/components/covers/cover-thumbnail";
import { CoverTypeTag } from "@/components/covers/cover-type-tag";
import { PerformerColorChip } from "@/components/performers/performer-color-chip";
import type { CoverListItem } from "@/lib/data/covers";
import { formatDate } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

// リスト行（3.3）: 56px サムネイル + タイトル情報 + 右カラムの種別・日付。
// カバー一覧・カバー詳細の関連セクションで再利用する。
export function CoverListRow({ cover }: { cover: CoverListItem }) {
  const thumbnailUrl = cover.sourceImageUrl ?? getYouTubeThumbnailUrl(cover.sourceUrl);
  const artists = cover.song.artists.map(({ artist }) => artist.name).join(", ");

  return (
    <Link
      href={`/covers/${cover.id}`}
      className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#FAFCFD]"
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-[3px] border border-rule bg-muted">
        <CoverThumbnail
          src={thumbnailUrl}
          alt=""
          coverType={cover.coverType}
          sizes="56px"
          imageClassName="object-cover"
          iconClassName="size-5"
        />
      </div>

      <div className="min-w-0">
        <p className="truncate">
          <span className="font-bold text-ink">{cover.song.title}</span>
          {artists ? (
            <span className="ml-2 text-sm font-normal text-[color:var(--slate-light)]">{artists}</span>
          ) : null}
        </p>
        {cover.performers.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {cover.performers.map(({ performer }) => (
              <PerformerColorChip key={performer.id} name={performer.name} colorCode={performer.colorCode} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <CoverTypeTag type={cover.coverType} />
        <span className="w-[5.5rem] text-right font-mono text-xs tabular-nums text-slate">
          {formatDate(cover.performedAt)}
        </span>
      </div>
    </Link>
  );
}
