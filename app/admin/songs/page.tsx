import { AdminNav } from "@/components/admin/admin-nav";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { getSearchParam, parsePageParam } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminSongs, listArtistOptions } from "@/lib/data/admin";
import { createSongAction, deleteSongAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSongsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const missingOriginalUrl = getSearchParam(params, "missing") === "originalUrl";
  const page = parsePageParam(getSearchParam(params, "page"));
  const [{ items: songs, totalCount, totalPages }, artists] = await Promise.all([
    listAdminSongs({ missingOriginalUrl }, page),
    listArtistOptions()
  ]);
  const error = getSearchParam(params, "error");
  const deleted = getSearchParam(params, "deleted") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="楽曲管理" description="楽曲マスタを追加・確認します。" />

      <form action="/admin/songs" className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="missing"
              value="originalUrl"
              defaultChecked={missingOriginalUrl}
              className="size-4 accent-primary"
            />
            原曲URL未入力のみ表示
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">絞り込み</Button>
            <Link href="/admin/songs" className="rounded-md border px-4 py-2 text-sm">
              条件クリア
            </Link>
          </div>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        全 {totalCount.toLocaleString("ja-JP")} 件 / {page}ページ目（表示中 {songs.length} 件）
        {missingOriginalUrl ? " / 原曲URL未入力" : ""}
      </p>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}

      {deleted ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          楽曲を削除しました。
        </div>
      ) : null}

      <form action={createSongAction} className="rounded-md border bg-card p-5">
        <div className="form-grid">
          <div className="space-y-2">
            <Label htmlFor="title">楽曲名</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artistIds">原曲アーティスト</Label>
            <Select id="artistIds" name="artistIds" multiple className="min-h-32">
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="originalUrl">原曲URL</Label>
            <Input id="originalUrl" name="originalUrl" type="url" />
          </div>
        </div>
        <Button type="submit" className="mt-4">
          追加
        </Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {songs.map((song) => (
            <div key={song.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
              <Link href={`/admin/songs/${song.id}`} className="font-medium text-primary underline">
                {song.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定"}
              </p>
              {song.originalUrl ? (
                <a href={song.originalUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-primary underline">
                  {song.originalUrl}
                </a>
              ) : null}
              </div>
              <Link href={`/admin/songs/${song.id}`} className="rounded-md border px-3 py-2 text-sm">
                編集
              </Link>
              <form action={deleteSongAction.bind(null, song.id)}>
                <DeleteSubmitButton
                  size="sm"
                  disabled={song._count.covers > 0}
                  confirmMessage={`楽曲「${song.title}」を削除します。よろしいですか？`}
                >
                  削除
                </DeleteSubmitButton>
              </form>
            </div>
          ))}
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/songs" params={params} />
    </div>
  );
}
