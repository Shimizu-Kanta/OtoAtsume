import Link from "next/link";
import { Users } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getGroups, type GroupSort } from "@/lib/data/groups";
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
    title: "グループ",
    description:
      "VTuber・歌い手グループの一覧です。グループごとに所属活動者と歌ってみた・歌枠・ライブの歌唱記録をまとめています。",
    robots: isFilteredListing(params) ? { index: false, follow: true } : undefined,
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

      <form action="/groups" className="overflow-hidden rounded-[4px] border border-rule bg-panel p-5">
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
          <p className="font-mono text-xs tabular-nums text-slate">{totalCount.toLocaleString("ja-JP")} groups</p>
        </div>
      </form>

      {groups.length > 0 ? (
        <div className="overflow-hidden rounded-[4px] border border-rule bg-panel">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-rule px-4 py-2">
            <span className="col-head">GROUP</span>
            <span className="col-head text-right">MEMBERS</span>
          </div>
          <div className="divide-y divide-rule">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFCFD]"
              >
                <span className="truncate font-bold text-ink">{group.name}</span>
                <span className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-slate">
                  <Users className="size-3.5 text-[color:var(--slate-light)]" aria-hidden="true" />
                  {group._count.performers.toLocaleString("ja-JP")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-6 text-sm text-slate">
          表示できるグループはまだ登録されていません。
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/groups" params={params} />
    </div>
  );
}
