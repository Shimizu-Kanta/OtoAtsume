import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";

import { CoverList } from "@/components/covers/cover-list";
import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { coverTypeOptions } from "@/lib/constants";
import { getApprovedCovers } from "@/lib/data/covers";
import { cn, getSearchParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoversPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = {
    performer: getSearchParam(params, "performer"),
    song: getSearchParam(params, "song"),
    artist: getSearchParam(params, "artist"),
    dateFrom: getSearchParam(params, "dateFrom"),
    dateTo: getSearchParam(params, "dateTo"),
    coverType: getSearchParam(params, "coverType")
  };
  const covers = await getApprovedCovers(search);

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

      <form action="/covers" className="rounded-md border bg-card p-4">
        <div className="form-grid">
          <Input name="performer" defaultValue={search.performer} placeholder="活動者名・別名" />
          <Input name="song" defaultValue={search.song} placeholder="楽曲名" />
          <Input name="artist" defaultValue={search.artist} placeholder="原曲アーティスト名" />
          <Select name="coverType" defaultValue={search.coverType ?? ""}>
            <option value="">歌唱種別すべて</option>
            {coverTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input name="dateFrom" type="date" defaultValue={search.dateFrom} />
          <Input name="dateTo" type="date" defaultValue={search.dateTo} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className={cn(buttonVariants())}>
            <Search className="size-4" />
            検索
          </button>
          <Link href="/covers" className={cn(buttonVariants({ variant: "outline" }))}>
            条件クリア
          </Link>
        </div>
      </form>

      <CoverList covers={covers} />
    </div>
  );
}
