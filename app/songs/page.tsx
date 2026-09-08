import Link from "next/link";
import { Search } from "lucide-react";

import { IndexSearchBar, IndexTable } from "@/components/index-table";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AddToWatchlistButton } from "@/components/watchlist/add-to-watchlist-button";
import { getSongs, type SongListItem, type SongSort } from "@/lib/data/songs";
import { cn, getSearchParam, isFilteredListing, parsePageParam } from "@/lib/utils";
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
    title: "楽曲",
    robots: isFilteredListing(params) ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: page > 1 ? `/songs?page=${page}` : "/songs"
    }
  };
}

function normalizeSongSort(value: string | undefined): SongSort {
  return value === "titleDesc" || value === "coverCountDesc" ? value : "titleAsc";
}

export default async function SongsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = getSearchParam(params, "q");
  const sort = normalizeSongSort(getSearchParam(params, "sort"));
  const page = parsePageParam(getSearchParam(params, "page"));
  const { items: songs, totalCount, totalPages } = await getSongs({ query: q, sort }, page);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="song catalogue"
        title="楽曲カタログ"
        description="楽曲名と原曲アーティスト名で検索できます。在庫数はその曲の歌唱記録の件数です。"
      />

      <form action="/songs">
        <IndexSearchBar countLabel={`${totalCount.toLocaleString("ja-JP")} songs`}>
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
            <label htmlFor="song-q" className="eyebrow-muted">
              keyword
            </label>
            <Input
              id="song-q"
              name="q"
              defaultValue={q}
              placeholder="楽曲名・アーティスト名"
              className="h-[42px]"
            />
          </div>
          <div className="flex flex-[0_1_200px] flex-col gap-2">
            <label htmlFor="song-sort" className="eyebrow-muted">
              order
            </label>
            <Select id="song-sort" name="sort" defaultValue={sort} className="h-[42px] text-[13px]">
              <option value="titleAsc">楽曲名 昇順</option>
              <option value="titleDesc">楽曲名 降順</option>
              <option value="coverCountDesc">歌唱記録が多い順</option>
            </Select>
          </div>
          <button type="submit" className={cn(buttonVariants({ variant: "board" }), "h-[42px] px-6")}>
            <Search className="size-4" />
            検索
          </button>
        </IndexSearchBar>
      </form>

      {songs.length > 0 ? (
        <IndexTable
          colA="title"
          colB="covers"
          rows={songs.map((song) => ({
            key: song.id,
            href: `/songs/${song.id}`,
            name: song.title,
            sub: artistNames(song),
            count: song._count.covers
          }))}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-[3px] border border-rule bg-panel p-6 text-sm text-slate shadow-lift">
          <p>条件に一致する楽曲は見つかりませんでした。</p>
          {q?.trim() ? (
            <AddToWatchlistButton songName={q.trim()} label="この曲が追加されたら教えてほしい" />
          ) : null}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/songs" params={params} />
    </div>
  );
}

function artistNames(song: SongListItem) {
  return song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定";
}
