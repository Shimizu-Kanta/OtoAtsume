import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
      <PageHeading title="楽曲" description="楽曲名と原曲アーティスト名で検索できます。" />

      <form action="/songs" className="overflow-hidden rounded-[4px] border border-rule bg-panel p-5">
        <div className="mb-5 flex flex-col gap-2 border-b border-rule pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">楽曲を探す</h2>
            <p className="mt-1 text-sm text-slate">
              楽曲名・原曲アーティスト名から、登録済みの歌唱記録を探せます。
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-slate">{totalCount.toLocaleString("ja-JP")} songs</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="song-q">検索キーワード</Label>
            <Input id="song-q" name="q" defaultValue={q} placeholder="楽曲名・アーティスト名" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="song-sort">並び替え</Label>
            <Select id="song-sort" name="sort" defaultValue={sort}>
              <option value="titleAsc">楽曲名 昇順</option>
              <option value="titleDesc">楽曲名 降順</option>
              <option value="coverCountDesc">歌唱記録が多い順</option>
            </Select>
          </div>
          <button type="submit" className={cn(buttonVariants(), "w-full md:w-auto")}>
            <Search className="size-4" />
            検索
          </button>
        </div>
      </form>

      {songs.length > 0 ? (
        <div className="overflow-hidden rounded-[4px] border border-rule bg-panel">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-rule px-4 py-2">
            <span className="col-head">TITLE</span>
            <span className="col-head text-right">COVERS</span>
          </div>
          <div className="divide-y divide-rule">
            {songs.map((song) => (
              <Link
                key={song.id}
                href={`/songs/${song.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFCFD]"
              >
                <span className="min-w-0 truncate">
                  <span className="font-bold text-ink">{song.title}</span>
                  <span className="ml-2 text-sm font-normal text-[color:var(--slate-light)]">
                    {artistNames(song)}
                  </span>
                </span>
                <span className="font-mono text-sm tabular-nums text-slate">
                  {song._count.covers.toLocaleString("ja-JP")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-6 text-sm text-slate">
          条件に一致する楽曲は見つかりませんでした。
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/songs" params={params} />
    </div>
  );
}

function artistNames(song: SongListItem) {
  return song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定";
}
