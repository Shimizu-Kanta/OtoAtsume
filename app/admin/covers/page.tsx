import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import {
  contentStatusLabel,
  contentStatusOptions,
  coverTypeLabel,
  coverTypeOptions
} from "@/lib/constants";
import { getAdminCovers } from "@/lib/data/covers";
import { formatDate, getSearchParam, parsePageParam } from "@/lib/utils";
import { deleteCoverAction, updateCoverStatusAction } from "./actions";
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
  const { items: covers, totalCount, totalPages } = await getAdminCovers(search, page);

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="カバー記録管理" description="カバー記録を検索し、編集・非表示対応できます。" />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}

      {deleted ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          カバー記録を削除しました。
        </div>
      ) : null}

      <form action="/admin/covers" className="rounded-md border bg-card p-4">
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
          <Select name="status" defaultValue={search.status ?? ""}>
            <option value="">ステータスすべて</option>
            {contentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input name="dateFrom" type="date" defaultValue={search.dateFrom} />
          <Input name="dateTo" type="date" defaultValue={search.dateTo} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">検索</Button>
          <Link href="/admin/covers" className="rounded-md border px-4 py-2 text-sm">
            条件クリア
          </Link>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        全 {totalCount.toLocaleString("ja-JP")} 件 / {page}ページ目（表示中 {covers.length} 件）
      </p>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {covers.map((cover) => (
            <div key={cover.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_360px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/covers/${cover.id}`} className="font-medium text-primary underline">
                    {cover.song.title}
                  </Link>
                  <Badge variant="outline">{contentStatusLabel(cover.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {cover.song.artists.map(({ artist }) => artist.name).join(", ")} /{" "}
                  {cover.performers.map(({ performer }) => performer.name).join(", ")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(cover.performedAt)} / {coverTypeLabel(cover.coverType)}
                </p>
                <a
                  href={cover.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block truncate text-sm text-primary underline"
                >
                  {cover.sourceUrl}
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <form action={updateCoverStatusAction} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={cover.id} />
                  <Select name="status" defaultValue={cover.status} aria-label="ステータス">
                    {contentStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="outline">
                    状態更新
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/covers/${cover.id}`} className="rounded-md border px-3 py-2 text-sm">
                    編集
                  </Link>
                  <Link href={`/covers/${cover.id}`} className="rounded-md border px-3 py-2 text-sm">
                    公開画面
                  </Link>
                  <form action={deleteCoverAction}>
                    <input type="hidden" name="id" value={cover.id} />
                    <DeleteSubmitButton
                      size="sm"
                      confirmMessage={`カバー記録「${cover.song.title}」を削除します。関連する通報も削除されます。よろしいですか？`}
                    >
                      削除
                    </DeleteSubmitButton>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/covers" params={params} />
    </div>
  );
}
