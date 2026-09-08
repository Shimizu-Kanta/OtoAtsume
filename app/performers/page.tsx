import Link from "next/link";
import { Search } from "lucide-react";

import { IndexSearchBar, IndexTable } from "@/components/index-table";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { TagGroupFilter } from "@/components/tag-group-filter";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getPerformers, type PerformerSort } from "@/lib/data/performers";
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
    title: "活動者",
    robots: isFilteredListing(params) ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: page > 1 ? `/performers?page=${page}` : "/performers"
    }
  };
}

export default async function PerformersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = getSearchParam(params, "q");
  const sort = normalizePerformerSort(getSearchParam(params, "sort"));
  const page = parsePageParam(getSearchParam(params, "page"));
  const selectedTagIds = getSelectedTagIds(params);
  const [{ items: performers, totalCount, totalPages }, tagFilter] = await Promise.all([
    getPerformers({ query: q, tagIds: selectedTagIds, sort }, page),
    listTagsGroupedForFilter()
  ]);
  const hasTags = tagFilter.grouped.some((group) => group.tags.length > 0) || tagFilter.ungrouped.length > 0;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="performer index"
        title="活動者インデックス"
        description="活動者名、別名、所属グループで検索できます。背表紙の色は活動者カラーです。タグ絞り込みとデビュー日順の並び替えに対応しています。"
      />

      <form action="/performers" className="flex flex-col gap-4">
        <IndexSearchBar countLabel={`${totalCount.toLocaleString("ja-JP")} performers`}>
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
            <label htmlFor="performer-q" className="eyebrow-muted">
              keyword
            </label>
            <Input
              id="performer-q"
              name="q"
              defaultValue={q}
              placeholder="活動者名・別名・グループ名"
              className="h-[42px]"
            />
          </div>
          <div className="flex flex-[0_1_200px] flex-col gap-2">
            <label htmlFor="performer-sort" className="eyebrow-muted">
              order
            </label>
            <Select id="performer-sort" name="sort" defaultValue={sort} className="h-[42px] text-[13px]">
              <option value="nameAsc">名前順</option>
              <option value="coverCountDesc">歌唱記録が多い順</option>
              <option value="debutDateAsc">デビュー日 昇順</option>
              <option value="debutDateDesc">デビュー日 降順</option>
            </Select>
          </div>
          <button type="submit" className={cn(buttonVariants({ variant: "board" }), "h-[42px] px-6")}>
            <Search className="size-4" />
            検索
          </button>
        </IndexSearchBar>

        {hasTags ? (
          <div className="rounded-[3px] border border-rule bg-panel p-4 shadow-lift">
            <p className="mb-3 eyebrow-muted">tags</p>
            <TagGroupFilter
              grouped={tagFilter.grouped}
              ungrouped={tagFilter.ungrouped}
              selectedTagIds={selectedTagIds}
            />
          </div>
        ) : null}
      </form>

      {performers.length > 0 ? (
        <IndexTable
          colA="performer"
          colB="records"
          rows={performers.map((performer) => ({
            key: performer.id,
            href: `/performers/${performer.id}`,
            name: performer.name,
            sub: performer.group?.name ?? null,
            count: performer._count.covers,
            colorCode: performer.colorCode
          }))}
        />
      ) : (
        <div className="rounded-[3px] border border-rule bg-panel p-6 text-sm text-slate shadow-lift">
          条件に一致する活動者は見つかりませんでした。
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/performers" params={params} />
    </div>
  );
}

function normalizePerformerSort(value: string | undefined): PerformerSort {
  return value === "debutDateAsc" || value === "debutDateDesc" || value === "coverCountDesc"
    ? value
    : "nameAsc";
}
