import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";

import { CoverResults } from "@/components/covers/cover-results";
import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const view = getSearchParam(params, "view");
  const safeView = view === "card" || view === "list" ? view : undefined;
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

      <form action="/covers" className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
        {safeView ? <input type="hidden" name="view" value={safeView} /> : null}
        <div className="mb-5 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">検索条件</h2>
            <p className="mt-1 text-sm text-muted-foreground">楽曲名・活動者名などで絞り込めます。</p>
          </div>
          <p className="text-sm font-medium text-primary">{covers.length}件</p>
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
        </div>
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

      <CoverResults covers={covers} initialViewMode={view} />
    </div>
  );
}
