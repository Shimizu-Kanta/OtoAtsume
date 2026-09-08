import Link from "next/link";
import { FilePlus2 } from "lucide-react";

import { CoverFilterPanel } from "@/components/covers/cover-filter-panel";
import { CoverResults } from "@/components/covers/cover-results";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { AddToWatchlistButton } from "@/components/watchlist/add-to-watchlist-button";
import { getApprovedCoverAlbums, getApprovedCovers, type CoverSort } from "@/lib/data/covers";
import { listTagsGroupedForFilter } from "@/lib/data/tags";
import { cn, getSearchParam, getSelectedTagIds, isFilteredListing, parsePageParam } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePageParam(getSearchParam(params, "page"));

  return {
    title: "歌唱記録",
    robots: isFilteredListing(params) ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: page > 1 ? `/covers?page=${page}` : "/covers"
    }
  };
}

function normalizeCoverSort(value: string | undefined): CoverSort {
  return value === "performedAtAsc" || value === "addedAtDesc" ? value : "performedAtDesc";
}

export default async function CoversPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sort = normalizeCoverSort(getSearchParam(params, "sort"));
  const selectedTagIds = getSelectedTagIds(params);
  const search = {
    performer: getSearchParam(params, "performer"),
    song: getSearchParam(params, "song"),
    artist: getSearchParam(params, "artist"),
    dateFrom: getSearchParam(params, "dateFrom"),
    dateTo: getSearchParam(params, "dateTo"),
    coverType: getSearchParam(params, "coverType"),
    tagIds: selectedTagIds,
    sort
  };
  const page = parsePageParam(getSearchParam(params, "page"));
  const view = getSearchParam(params, "view");
  const safeView = view === "card" || view === "list" ? view : undefined;
  // カード表示はアルバム単位、リスト表示は曲単位でページングするため両方を取得する。
  const [albums, covers, tagFilter] = await Promise.all([
    getApprovedCoverAlbums(search, page),
    getApprovedCovers(search, page),
    listTagsGroupedForFilter()
  ]);
  const totalCount = covers.totalCount;
  // Pagination はサーバコンポーネント側にあるため、表示モードは URL クエリの view からのみ
  // 判定する（未指定時はカード扱い）。
  const totalPages = safeView === "list" ? covers.totalPages : albums.totalPages;

  return (
    <div>
      <PageHeading
        eyebrow="browse the racks"
        title="棚から探す"
        description="公開済みの歌唱記録を検索できます。1本の配信に複数曲が入っている場合は、複数曲入りの一枚として並べています。"
        actions={
          <Link href="/covers/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            <FilePlus2 className="size-4" />
            一枚を持ち込む
          </Link>
        }
      />

      {/* 左は仕切り板（絞り込み）、右は棚。狭い画面では1カラムに落とす。 */}
      <div className="grid items-start gap-6 lg:grid-cols-[236px_minmax(0,1fr)]">
        <CoverFilterPanel
          search={search}
          sort={sort}
          selectedTagIds={selectedTagIds}
          tagFilter={tagFilter}
          view={safeView}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <CoverResults
            covers={covers.items}
            albums={albums.items}
            totalCount={totalCount}
            albumCount={albums.totalCount}
            initialViewMode={view}
          />

          {covers.items.length === 0 && search.song?.trim() ? (
            <div className="rounded-[3px] border border-rule bg-panel p-6 text-sm text-slate shadow-lift">
              <AddToWatchlistButton
                songName={search.song.trim()}
                label="この曲が追加されたら教えてほしい"
              />
            </div>
          ) : null}

          <Pagination page={page} totalPages={totalPages} basePath="/covers" params={params} />
        </div>
      </div>
    </div>
  );
}
