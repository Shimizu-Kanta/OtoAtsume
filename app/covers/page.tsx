import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";

import { CoverResults } from "@/components/covers/cover-results";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { TagGroupFilter } from "@/components/tag-group-filter";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { coverTypeOptions } from "@/lib/constants";
import { getApprovedCovers, type CoverSort } from "@/lib/data/covers";
import { listTagsGroupedForFilter } from "@/lib/data/tags";
import { cn, getSearchParam, getSelectedTagIds, parsePageParam } from "@/lib/utils";
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
    title: "カバー記録",
    alternates: {
      canonical: page > 1 ? `/covers?page=${page}` : "/covers"
    }
  };
}

function normalizeCoverSort(value: string | undefined): CoverSort {
  return value === "performedAtAsc" ? value : "performedAtDesc";
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
  const [{ items: covers, totalCount, totalPages }, tagFilter] = await Promise.all([
    getApprovedCovers(search, page),
    listTagsGroupedForFilter()
  ]);
  const hasTags = tagFilter.grouped.some((group) => group.tags.length > 0) || tagFilter.ungrouped.length > 0;

  return (
    <div className="space-y-6">
      <PageHeading
        title="カバー記録"
        description="公開済みの歌唱記録を検索できます。同じ情報元URLに複数曲が紐づく場合も正常な記録として扱います。"
        actions={
          <Link href="/covers/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            <FilePlus2 className="size-4" />
            登録
          </Link>
        }
      />

      <form action="/covers" className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
        {safeView ? <input type="hidden" name="view" value={safeView} /> : null}
        <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">検索条件</h2>
            <p className="mt-1 text-sm text-muted-foreground">楽曲名・活動者名などで絞り込めます。</p>
          </div>
          <p className="text-sm font-medium text-primary">{totalCount.toLocaleString("ja-JP")}件</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="performer">活動者</Label>
            <Input id="performer" name="performer" defaultValue={search.performer} placeholder="活動者名・別名" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="song">楽曲</Label>
            <Input id="song" name="song" defaultValue={search.song} placeholder="楽曲名" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist">原曲アーティスト</Label>
            <Input id="artist" name="artist" defaultValue={search.artist} placeholder="原曲アーティスト名" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverType">歌唱種別</Label>
            <Select id="coverType" name="coverType" defaultValue={search.coverType ?? ""}>
              <option value="">歌唱種別すべて</option>
              {coverTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFrom">歌唱日（開始）</Label>
            <Input id="dateFrom" name="dateFrom" type="date" defaultValue={search.dateFrom} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo">歌唱日（終了）</Label>
            <Input id="dateTo" name="dateTo" type="date" defaultValue={search.dateTo} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort">並び替え</Label>
            <Select id="sort" name="sort" defaultValue={sort}>
              <option value="performedAtDesc">歌唱日 新しい順</option>
              <option value="performedAtAsc">歌唱日 古い順</option>
            </Select>
          </div>
        </div>

        {hasTags ? (
          <details className="mt-5 border-t pt-4" open={selectedTagIds.length > 0}>
            <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground">
              タグで絞り込む
              {selectedTagIds.length > 0 ? (
                <span className="ml-1 text-primary">（{selectedTagIds.length}件選択中）</span>
              ) : null}
            </summary>
            <div className="mt-3">
              <TagGroupFilter
                grouped={tagFilter.grouped}
                ungrouped={tagFilter.ungrouped}
                selectedTagIds={selectedTagIds}
              />
            </div>
          </details>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" className={cn(buttonVariants())}>
            <Search className="size-4" />
            検索
          </button>
          <Link href="/covers" className={cn(buttonVariants({ variant: "outline" }))}>
            条件クリア
          </Link>
        </div>
      </form>

      <CoverResults covers={covers} totalCount={totalCount} initialViewMode={view} />

      <Pagination page={page} totalPages={totalPages} basePath="/covers" params={params} />
    </div>
  );
}
