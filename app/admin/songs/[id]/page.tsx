import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminSong, listArtistOptions } from "@/lib/data/admin";
import { getSearchParam } from "@/lib/utils";
import { updateSongAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSongEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [song, artists] = await Promise.all([getAdminSong(id), listArtistOptions()]);

  if (!song) {
    notFound();
  }

  const action = updateSongAction.bind(null, song.id);
  const selectedArtistIds = song.artists.map(({ artistId }) => artistId);
  const error = getSearchParam(query, "error");
  const updated = getSearchParam(query, "updated") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="楽曲編集" description="楽曲名、原曲URL、原曲アーティストを編集できます。" />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {updated ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          楽曲を更新しました。
        </div>
      ) : null}

      <form action={action} className="rounded-md border bg-card p-5">
        <div className="form-grid">
          <div className="space-y-2">
            <Label htmlFor="title">楽曲名</Label>
            <Input id="title" name="title" defaultValue={song.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artistIds">既存アーティスト</Label>
            <Select id="artistIds" name="artistIds" multiple className="min-h-40" defaultValue={selectedArtistIds}>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="artistNames">アーティスト名を直接入力</Label>
            <Textarea id="artistNames" name="artistNames" placeholder="未登録アーティストを追加する場合のみ入力。改行・カンマ区切り対応。" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="originalUrl">原曲URL</Label>
            <Input id="originalUrl" name="originalUrl" type="url" defaultValue={song.originalUrl ?? ""} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">更新する</Button>
          <Link href="/admin/songs" className="rounded-md border px-4 py-2 text-sm">
            一覧に戻る
          </Link>
        </div>
      </form>
    </div>
  );
}
