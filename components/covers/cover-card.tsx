import Link from "next/link";

import { AddToBasketButton } from "@/components/basket/add-to-basket-button";
import { CoverJacket } from "@/components/covers/cover-jacket";
import { CoverTypeTag } from "@/components/covers/cover-type-tag";
import { PerformerColorChip } from "@/components/performers/performer-color-chip";
import { buildTracklessObiText } from "@/lib/covers/obi";
import type { CoverListItem } from "@/lib/data/covers";
import { formatDate } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

function artistNames(cover: CoverListItem) {
  return cover.song.artists.map(({ artist }) => artist.name).join(", ");
}

export function CoverCard({ cover }: { cover: CoverListItem }) {
  const thumbnailUrl = cover.sourceImageUrl ?? getYouTubeThumbnailUrl(cover.sourceUrl);
  const title = cover.song.title;
  const artists = artistNames(cover);

  return (
    // カード全体を <a> で囲まない。かごのボタンを内側に置くと <a> の中に
    // <button> が入って HTML として不正になるため、タイトルの <a> に
    // after:absolute after:inset-0 を付けて全面をクリック可能にする。
    <div className="group relative flex h-full min-w-0 flex-col gap-2.5">
      <div className="relative">
        <CoverJacket
          src={thumbnailUrl}
          alt={`${title} のサムネイル`}
          coverType={cover.coverType}
          obiText={buildTracklessObiText({
            coverType: cover.coverType,
            performedAt: cover.performedAt
          })}
          showDisc
          sizes="(min-width: 1280px) 200px, (min-width: 640px) 25vw, 45vw"
          iconClassName="size-9"
        >
          {/* かごに入れる。左端は帯が占めるのでその外側に置く。 */}
          <div className="absolute bottom-1.5 left-[28px] z-40 sm:left-[38px]">
            <AddToBasketButton coverIds={[cover.id]} label="かごに入れる" />
          </div>

          {/* 配信・動画名の帯。ホバー時のみ見せるが、クローラからテキストが消えないよう
              条件レンダリングにはせず DOM に常在させて CSS の opacity で出し入れする。
              スマホではホバーが無く表示されないが、同じ情報は詳細ページにある。 */}
          {cover.sourceTitle ? (
            <div className="absolute inset-x-0 bottom-0 z-30 bg-board/90 px-2 py-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span className="line-clamp-2 text-[11px] leading-4 text-board-ink">
                {cover.sourceTitle}
              </span>
            </div>
          ) : null}
        </CoverJacket>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="min-w-0 space-y-1.5">
          {/* カードのタイトルは文書構造上の見出しではないため、見出しタグを使わず装飾テキストにする
              （セクション見出しの h2 と階層が競合しないようにする）。 */}
          <p className="line-clamp-2 text-[13px] font-bold leading-[18px] text-ink">
            <Link
              href={`/covers/${cover.id}`}
              className="after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:underline focus-visible:outline-none"
            >
              {title}
            </Link>
          </p>

          {cover.performers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {cover.performers.map(({ performer }) => (
                <PerformerColorChip
                  key={performer.id}
                  name={performer.name}
                  colorCode={performer.colorCode}
                />
              ))}
            </div>
          ) : null}

          {artists ? <p className="truncate text-xs text-slate">{artists}</p> : null}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <CoverTypeTag type={cover.coverType} />
          <span className="font-mono text-[10px] tabular-nums text-[color:var(--slate-light)]">
            {formatDate(cover.performedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
