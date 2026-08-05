import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { PerformerColorDot } from "@/components/performers/performer-color-dot";
import { TagGroupFilter } from "@/components/tag-group-filter";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        title="活動者"
        description="活動者名、別名、所属グループで検索できます。タグ絞り込みとデビュー日順の並び替えに対応しています。"
      />

      <form action="/performers" className="overflow-hidden rounded-[4px] border border-rule bg-panel p-5">
        <div className="mb-5 flex flex-col gap-2 border-b border-rule pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">活動者を探す</h2>
            <p className="mt-1 text-sm text-slate">
              名前・別名・所属グループ・タグを組み合わせて絞り込めます。
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-slate">{totalCount.toLocaleString("ja-JP")} performers</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="performer-q">検索キーワード</Label>
            <Input id="performer-q" name="q" defaultValue={q} placeholder="活動者名・別名・グループ名" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="performer-sort">並び替え</Label>
            <Select id="performer-sort" name="sort" defaultValue={sort}>
              <option value="nameAsc">名前順</option>
              <option value="coverCountDesc">歌唱記録が多い順</option>
              <option value="debutDateAsc">デビュー日 昇順</option>
              <option value="debutDateDesc">デビュー日 降順</option>
            </Select>
          </div>
          <button type="submit" className={cn(buttonVariants(), "w-full md:w-auto")}>
            <Search className="size-4" />
            検索
          </button>
        </div>

        {hasTags ? (
          <div className="mt-5 border-t border-rule pt-4">
            <p className="mb-3 text-sm font-medium text-slate">タグで絞り込み</p>
            <TagGroupFilter
              grouped={tagFilter.grouped}
              ungrouped={tagFilter.ungrouped}
              selectedTagIds={selectedTagIds}
            />
          </div>
        ) : null}
      </form>

      {performers.length > 0 ? (
        <div className="overflow-hidden rounded-[4px] border border-rule bg-panel">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-rule px-4 py-2">
            <span className="col-head">PERFORMER</span>
            <span className="col-head text-right">RECORDS</span>
          </div>
          <div className="divide-y divide-rule">
            {performers.map((performer) => (
              <Link
                key={performer.id}
                href={`/performers/${performer.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFCFD]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <PerformerColorDot colorCode={performer.colorCode} />
                  <span className="truncate">
                    <span className="font-bold text-ink">{performer.name}</span>
                    {performer.group ? (
                      <span className="ml-2 text-sm font-normal text-[color:var(--slate-light)]">
                        {performer.group.name}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="font-mono text-sm tabular-nums text-slate">
                  {performer._count.covers.toLocaleString("ja-JP")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-6 text-sm text-slate">
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
