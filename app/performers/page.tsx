import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getPerformers, type PerformerSort } from "@/lib/data/performers";
import { listTags } from "@/lib/data/tags";
import { cn, formatDateInput, getSearchParam, parsePageParam } from "@/lib/utils";
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
  const selectedTags = getSelectedTags(params);
  const [{ items: performers, totalCount, totalPages }, tags] = await Promise.all([
    getPerformers({ query: q, tagNames: selectedTags, sort }, page),
    listTags()
  ]);
  const selectedTagSet = new Set(selectedTags);

  return (
    <div className="space-y-6">
      <PageHeading
        title="活動者"
        description="活動者名、別名、所属グループで検索できます。タグ絞り込みとデビュー日順の並び替えに対応しています。"
      />

      <form action="/performers" className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">活動者を探す</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              名前・別名・所属グループ・タグを組み合わせて絞り込めます。
            </p>
          </div>
          <p className="text-sm font-medium text-primary">{totalCount.toLocaleString("ja-JP")}件</p>
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
              <option value="debutDateAsc">デビュー日 昇順</option>
              <option value="debutDateDesc">デビュー日 降順</option>
            </Select>
          </div>
          <button type="submit" className={cn(buttonVariants(), "w-full md:w-auto")}>
            <Search className="size-4" />
            検索
          </button>
        </div>

        {tags.length > 0 ? (
          <div className="mt-5 border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">タグで絞り込み</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = selectedTagSet.has(tag.name);

                return (
                  <label
                    key={tag.id}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                        : "border-border bg-background/80 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    <input
                      type="checkbox"
                      name="tag"
                      value={tag.name}
                      defaultChecked={selected}
                      className="size-4 accent-primary"
                    />
                    {tag.name}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </form>

      {performers.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {performers.map((performer) => (
            <article
              key={performer.id}
              className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              style={{
                borderTopColor: performer.colorCode ?? undefined,
                borderTopWidth: performer.colorCode ? 4 : undefined,
                backgroundImage: performer.colorCode
                  ? `linear-gradient(135deg, ${performer.colorCode}14, transparent 42%)`
                  : undefined
              }}
            >
              <div className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/performers/${performer.id}`}
                      className="text-lg font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      {performer.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {performer.group?.name ?? "所属なし"} / 歌唱記録 {performer._count.covers} 件
                    </p>
                  </div>
                  {performer.colorCode ? (
                    <span
                      aria-label={`活動者カラー ${performer.colorCode}`}
                      className="mt-1 size-8 shrink-0 rounded-full border shadow-sm"
                      style={{ backgroundColor: performer.colorCode }}
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {performer.debutDate ? (
                    <Badge variant="muted">デビュー日 {formatDateInput(performer.debutDate)}</Badge>
                  ) : null}
                  {performer.tags.map(({ tag }) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
                </div>

                {performer.youtubeUrl ? (
                  <a
                    href={performer.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {performer.youtubeUrl}
                  </a>
                ) : null}

                <div className="mt-auto flex justify-end border-t pt-4">
                  <Link
                    href={`/performers/${performer.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    詳細を見る
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-primary/10 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm">
          条件に一致する活動者は見つかりませんでした。
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/performers" params={params} />
    </div>
  );
}

function normalizePerformerSort(value: string | undefined): PerformerSort {
  return value === "debutDateAsc" || value === "debutDateDesc" ? value : "nameAsc";
}

function getSelectedTags(params: Record<string, string | string[] | undefined>) {
  const values = [
    ...toArray(params.tag),
    ...toArray(params.tags).flatMap((value) => value.split(","))
  ];

  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}
