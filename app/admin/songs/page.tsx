import { AdminNav } from "@/components/admin/admin-nav";
import Image from "next/image";
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
import { parseOriginalUrlCandidates } from "@/lib/original-url-suggestions";
import { createSongAction, deleteSongAction } from "./actions";
import { FetchCandidatesButton } from "./fetch-candidates-button";
import {
  adoptOriginalUrlCandidateAction,
  dismissOriginalUrlCandidatesAction,
  refetchOriginalUrlCandidatesAction
} from "./original-url-actions";

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          全 {totalCount.toLocaleString("ja-JP")} 件 / {page}ページ目（表示中 {songs.length} 件）
          {missingOriginalUrl ? " / 原曲URL未入力" : ""}
        </p>
        {missingOriginalUrl ? <FetchCandidatesButton /> : null}
      </div>

      {missingOriginalUrl ? (
        <p className="text-xs text-muted-foreground">
          YouTube検索で原曲URL候補を取得します（未取得の楽曲を作成日が古い順に最大30件）。
          search.list は1日100回の専用クォータのため、続けて押す前に候補の採用を進めてください。
        </p>
      ) : null}

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
          {songs.map((song) => {
            const candidates = parseOriginalUrlCandidates(song.originalUrlCandidates);

            return (
              <div key={song.id} className="p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <Link href={`/admin/songs/${song.id}`} className="font-medium text-primary underline">
                      {song.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定"}
                    </p>
                    {song.originalUrl ? (
                      <a
                        href={song.originalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-sm text-primary underline"
                      >
                        {song.originalUrl}
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>

                {missingOriginalUrl && !song.originalUrl ? (
                  <div className="mt-3">
                    {candidates.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {candidates.map((candidate) => (
                          <form
                            key={candidate.videoId}
                            action={adoptOriginalUrlCandidateAction.bind(null, song.id, candidate.videoId)}
                          >
                            <div className="rounded-md border p-2">
                              {candidate.thumbnailUrl ? (
                                <Image
                                  src={candidate.thumbnailUrl}
                                  alt={candidate.title}
                                  width={320}
                                  height={180}
                                  unoptimized
                                  className="aspect-video w-full rounded object-cover"
                                />
                              ) : null}
                              <p className="mt-1 line-clamp-2 text-sm">{candidate.title}</p>
                              <p className="text-xs text-muted-foreground">{candidate.channelTitle}</p>
                              <Button type="submit" size="sm" className="mt-2 w-full">
                                この動画を採用
                              </Button>
                            </div>
                          </form>
                        ))}
                      </div>
                    ) : song.originalUrlCandidatesFetchedAt ? (
                      <p className="text-sm text-muted-foreground">候補は見つかりませんでした。</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">候補は未取得です。</p>
                    )}

                    <div className="mt-2 flex gap-2">
                      <form action={refetchOriginalUrlCandidatesAction.bind(null, song.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          再検索
                        </Button>
                      </form>
                      {candidates.length > 0 ? (
                        <form action={dismissOriginalUrlCandidatesAction.bind(null, song.id)}>
                          <Button type="submit" size="sm" variant="ghost">
                            候補を消す
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/songs" params={params} />
    </div>
  );
}
