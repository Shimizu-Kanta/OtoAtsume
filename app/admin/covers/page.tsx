import Link from "next/link";
import { Search } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Pagination } from "@/components/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  contentStatusOptions,
  coverTypeLabel,
  coverTypeOptions
} from "@/lib/constants";
import { getAdminCovers } from "@/lib/data/covers";
import { formatDate, getSearchParam, parsePageParam } from "@/lib/utils";
import { CoversTable, type AdminCoverRow } from "./covers-table";
import { requireAdminPage } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminCoversPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const error = getSearchParam(params, "error");
  const deleted = getSearchParam(params, "deleted") === "1";
  const search = {
    performer: getSearchParam(params, "performer"),
    song: getSearchParam(params, "song"),
    artist: getSearchParam(params, "artist"),
    dateFrom: getSearchParam(params, "dateFrom"),
    dateTo: getSearchParam(params, "dateTo"),
    coverType: getSearchParam(params, "coverType"),
    status: getSearchParam(params, "status")
  };
  const page = parsePageParam(getSearchParam(params, "page"));
  const bulkUpdatedParam = getSearchParam(params, "bulkUpdated");
  const bulkUpdated = bulkUpdatedParam && /^\d+$/.test(bulkUpdatedParam) ? Number(bulkUpdatedParam) : null;
  const { items: covers, totalCount, totalPages } = await getAdminCovers(search, page);

  // 一括変更のあと同じ絞り込み条件・ページに戻すため、今のクエリ文字列を渡しておく。
  const returnQuery = buildQueryString(params);
  const rows: AdminCoverRow[] = covers.map((cover) => ({
    id: cover.id,
    songTitle: cover.song.title,
    artistNames: cover.song.artists.map(({ artist }) => artist.name).join(", "),
    performerNames: cover.performers.map(({ performer }) => performer.name).join(", "),
    performedAt: formatDate(cover.performedAt),
    coverTypeLabel: coverTypeLabel(cover.coverType),
    status: cover.status,
    sourceUrl: cover.sourceUrl,
    sourceHost: hostnameOf(cover.sourceUrl)
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="歌唱記録管理"
        description="歌唱記録を検索し、編集・非表示対応できます。"
        actions={
          <Link href="/admin/covers/bulk-new" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            一括登録
          </Link>
        }
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}

      {deleted ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          歌唱記録を削除しました。
        </div>
      ) : null}

      {bulkUpdated !== null ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm" role="status">
          {bulkUpdated} 件の状態を変更しました。
        </div>
      ) : null}

      <form action="/admin/covers" className="space-y-2 rounded-md border bg-card p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            name="performer"
            defaultValue={search.performer}
            placeholder="活動者名・別名"
            aria-label="活動者名・別名"
            className="h-9 md:flex-1"
          />
          <Input
            name="song"
            defaultValue={search.song}
            placeholder="楽曲名"
            aria-label="楽曲名"
            className="h-9 md:flex-1"
          />
          <Input
            name="artist"
            defaultValue={search.artist}
            placeholder="原曲アーティスト名"
            aria-label="原曲アーティスト名"
            className="h-9 md:flex-1"
          />
          <Button type="submit" size="sm" className="shrink-0">
            <Search className="size-4" aria-hidden="true" />
            検索
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            name="coverType"
            defaultValue={search.coverType ?? ""}
            aria-label="歌唱種別"
            className="h-9 min-w-0 flex-1 sm:w-auto sm:min-w-[10rem] sm:flex-none"
          >
            <option value="">歌唱種別すべて</option>
            {coverTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            name="status"
            defaultValue={search.status ?? ""}
            aria-label="ステータス"
            className="h-9 min-w-0 flex-1 sm:w-auto sm:min-w-[9rem] sm:flex-none"
          >
            <option value="">ステータスすべて</option>
            {contentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <Input
              name="dateFrom"
              type="date"
              defaultValue={search.dateFrom}
              aria-label="歌唱日(から)"
              className="h-9 min-w-0 flex-1 sm:w-auto sm:flex-none"
            />
            <span className="text-sm text-muted-foreground">〜</span>
            <Input
              name="dateTo"
              type="date"
              defaultValue={search.dateTo}
              aria-label="歌唱日(まで)"
              className="h-9 min-w-0 flex-1 sm:w-auto sm:flex-none"
            />
          </div>
          <Link href="/admin/covers" className="ml-auto text-sm text-muted-foreground hover:text-foreground hover:underline">
            条件クリア
          </Link>
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-right font-mono text-xs tabular-nums text-muted-foreground">
          全 {totalCount.toLocaleString("ja-JP")} 件 / {page}ページ目
        </p>
        <CoversTable rows={rows} returnQuery={returnQuery} />
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/covers" params={params} />
    </div>
  );
}

function buildQueryString(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, item);
    }
  }

  return query.toString();
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "リンク";
  }
}
