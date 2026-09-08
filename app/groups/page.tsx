import { IndexSearchBar, IndexTable } from "@/components/index-table";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
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
        eyebrow="group index"
        title="グループ棚"
        description="活動者が所属するグループの一覧です。グループごとの歌唱記録や所属活動者を確認できます。"
      />

      <form action="/groups">
        <IndexSearchBar countLabel={`${totalCount.toLocaleString("ja-JP")} groups`}>
          <div className="flex flex-[0_1_220px] flex-col gap-2">
            <label htmlFor="group-sort" className="eyebrow-muted">
              order
            </label>
            <Select id="group-sort" name="sort" defaultValue={sort} className="h-[42px] text-[13px]">
              <option value="nameAsc">グループ名 昇順</option>
              <option value="performerCountDesc">所属活動者が多い順</option>
            </Select>
          </div>
          <button type="submit" className={cn(buttonVariants({ variant: "board" }), "h-[42px] px-6")}>
            適用
          </button>
        </IndexSearchBar>
      </form>

      {groups.length > 0 ? (
        <IndexTable
          colA="group"
          colB="members"
          rows={groups.map((group) => ({
            key: group.id,
            href: `/groups/${group.id}`,
            name: group.name,
            count: group._count.performers
          }))}
        />
      ) : (
        <div className="rounded-[3px] border border-rule bg-panel p-6 text-sm text-slate shadow-lift">
          表示できるグループはまだ登録されていません。
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/groups" params={params} />
    </div>
  );
}
