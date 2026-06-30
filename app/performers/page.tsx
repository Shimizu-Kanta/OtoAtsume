import Link from "next/link";
import { Search, UserPlus } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listTags } from "@/lib/data/tags";
import { getPerformers, type PerformerSort } from "@/lib/data/performers";
import { cn, formatDateInput, getSearchParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerformersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = getSearchParam(params, "q");
  const sort = normalizePerformerSort(getSearchParam(params, "sort"));
  const selectedTags = getSelectedTags(params);
  const [performers, tags] = await Promise.all([
    getPerformers({ query: q, tagNames: selectedTags, sort }),
    listTags()
  ]);
  const selectedTagSet = new Set(selectedTags);

  return (
    <div className="space-y-6">
      <PageHeading
        title="活動者"
        description="活動者名、別名、所属グループで検索できます。タグ絞り込みとデビュー日順の並び替えに対応しています。"
        actions={
          <Link
            href="/performer-applications/new"
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            <UserPlus className="size-4" />
            活動者申請
          </Link>
        }
      />

      <form action="/performers" className="space-y-4 rounded-md border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <Input name="q" defaultValue={q} placeholder="活動者名・別名・グループ名" />
          <Select name="sort" defaultValue={sort}>
            <option value="nameAsc">名前順</option>
            <option value="debutDateAsc">デビュー日 昇順</option>
            <option value="debutDateDesc">デビュー日 降順</option>
          </Select>
          <button type="submit" className={cn(buttonVariants())}>
            <Search className="size-4" />
            検索
          </button>
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-sm border px-2 py-1 text-sm",
                  selectedTagSet.has(tag.name) && "border-primary bg-primary/10 text-primary"
                )}
              >
                <input
                  type="checkbox"
                  name="tag"
                  value={tag.name}
                  defaultChecked={selectedTagSet.has(tag.name)}
                  className="size-4"
                />
                {tag.name}
              </label>
            ))}
          </div>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {performers.map((performer) => (
            <div
              key={performer.id}
              className="grid gap-2 border-l-8 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[1fr_auto]"
              style={{
                borderLeftColor: performer.colorCode ?? "transparent",
                backgroundImage: performer.colorCode
                  ? `linear-gradient(90deg, ${performer.colorCode}1F, transparent 34%)`
                  : undefined
              }}
            >
              <div>
                <Link href={`/performers/${performer.id}`} className="font-medium text-primary underline">
                  {performer.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {performer.group?.name ?? "所属なし"} / 歌唱記録 {performer._count.covers} 件
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {performer.colorCode ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <span
                        className="size-3 rounded-sm border"
                        style={{ backgroundColor: performer.colorCode }}
                      />
                      {performer.colorCode}
                    </span>
                  ) : null}
                  {performer.debutDate ? (
                    <span className="text-xs text-muted-foreground">
                      デビュー日: {formatDateInput(performer.debutDate)}
                    </span>
                  ) : null}
                  {performer.tags.map(({ tag }) => (
                    <span key={tag.id} className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {tag.name}
                    </span>
                  ))}
                </div>
                {performer.youtubeUrl ? (
                  <a
                    href={performer.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm text-primary underline"
                  >
                    {performer.youtubeUrl}
                  </a>
                ) : null}
              </div>
              <Link
                href={`/performers/${performer.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
              >
                詳細
              </Link>
            </div>
          ))}
        </div>
      </div>
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
