import Link from "next/link";
import { Users } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getGroups, type GroupSort } from "@/lib/data/groups";
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
    title: "グループ",
    description:
      "VTuber・歌い手グループの一覧です。グループごとに所属活動者と歌ってみた・歌枠・ライブの歌唱記録をまとめています。",
    alternates: {
      canonical: page > 1 ? `/groups?page=${page}` : "/groups"
    },
    openGraph: {
      type: "website",
      url: "/groups",
      siteName: "おとあつめ",
      title: "グループ",
      description: "VTuber・歌い手グループごとに所属活動者と歌唱記録をまとめています。"
    },
    twitter: {
      card: "summary",
      title: "グループ",
      description: "VTuber・歌い手グループごとに所属活動者と歌唱記録をまとめています。"
    }
  };
}

function normalizeGroupSort(value: string | undefined): GroupSort {
  return value === "performerCountDesc" ? value : "nameAsc";
}

export default async function GroupsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sort = normalizeGroupSort(getSearchParam(params, "sort"));
  const page = parsePageParam(getSearchParam(params, "page"));
  const { items: groups, totalCount, totalPages } = await getGroups(sort, page);

  return (
    <div className="space-y-6">
      <PageHeading
        title="グループ"
        description="活動者が所属するグループの一覧です。グループごとの歌唱記録や所属活動者を確認できます。"
      />

      <form action="/groups" className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-4 sm:grid-cols-[220px_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="group-sort">並び替え</Label>
              <Select id="group-sort" name="sort" defaultValue={sort}>
                <option value="nameAsc">グループ名 昇順</option>
                <option value="performerCountDesc">所属活動者が多い順</option>
              </Select>
            </div>
            <button type="submit" className={cn(buttonVariants(), "w-full sm:w-auto")}>
              適用
            </button>
          </div>
          <p className="text-sm font-medium text-primary">{totalCount.toLocaleString("ja-JP")}件</p>
        </div>
      </form>

      {groups.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <article
              key={group.id}
              className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-full flex-col gap-4 p-5">
                <div className="min-w-0">
                  <Link
                    href={`/groups/${group.id}`}
                    className="text-lg font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {group.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="size-4" aria-hidden="true" />
                    所属活動者 {group._count.performers} 名
                  </p>
                </div>

                <div className="mt-auto flex justify-end border-t pt-4">
                  <Link
                    href={`/groups/${group.id}`}
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
          表示できるグループはまだ登録されていません。
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/groups" params={params} />
    </div>
  );
}
