import Link from "next/link";
import { Disc3, ExternalLink, Music2, Search } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getSongs, type SongListItem, type SongSort } from "@/lib/data/songs";
import { cn, getSearchParam, parsePageParam } from "@/lib/utils";
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

      <form action="/songs" className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">楽曲を探す</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              楽曲名・原曲アーティスト名から、登録済みのカバー記録を探せます。
            </p>
          </div>
          <p className="text-sm font-medium text-primary">{totalCount.toLocaleString("ja-JP")}件</p>
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
              <option value="coverCountDesc">カバー記録が多い順</option>
            </Select>
          </div>
          <button type="submit" className={cn(buttonVariants(), "w-full md:w-auto")}>
            <Search className="size-4" />
            検索
          </button>
        </div>
      </form>

      {songs.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-primary/10 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm">
          条件に一致する楽曲は見つかりませんでした。
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/songs" params={params} />
    </div>
  );
}

function SongCard({ song }: { song: SongListItem }) {
  const artists = artistNames(song);

  return (
    <article className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Disc3 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/songs/${song.id}`}
              className="text-lg font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {song.title}
            </Link>
            <p className="mt-1 truncate text-sm text-muted-foreground">{artists}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">
            <Music2 className="mr-1 size-3" aria-hidden="true" />
            カバー記録 {song._count.covers} 件
          </Badge>
          {song.originalUrl ? (
            <Badge variant="outline">
              <ExternalLink className="mr-1 size-3" aria-hidden="true" />
              原曲URLあり
            </Badge>
          ) : null}
        </div>

        <div className="mt-auto flex justify-end border-t pt-4">
          <Link href={`/songs/${song.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            詳細を見る
          </Link>
        </div>
      </div>
    </article>
  );
}

function artistNames(song: SongListItem) {
  return song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定";
}
