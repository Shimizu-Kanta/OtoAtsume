import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { PerformerPicker } from "@/components/covers/performer-picker";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { coverTypeOptions } from "@/lib/constants";
import { requireAdminPage } from "@/lib/auth/admin";
import { getCoverCandidate } from "@/lib/data/cover-candidates";
import { getPerformerOptions } from "@/lib/data/performers";
import { findPerformerSuggestions, findSongSuggestions } from "@/lib/youtube/suggestions";
import { getSearchParam } from "@/lib/utils";
import { adoptCoverVideoCandidateAction } from "../actions";
import { SongSuggestionButtons } from "./song-suggestion-buttons";

export const dynamic = "force-dynamic";

export default async function AdminCoverCandidateConfirmPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const candidate = await getCoverCandidate(id);

  if (!candidate) {
    notFound();
  }

  // 歌枠・メドレーは1URL複数曲のため確定フォームの対象外。一括登録画面へ誘導する。
  if (candidate.detectedType === "KARAOKE_STREAM" || candidate.detectedType === "MEDLEY") {
    const handoff = new URLSearchParams();
    handoff.set("sourceUrl", candidate.videoUrl);
    handoff.set("performedAt", candidate.publishedAt.toISOString().slice(0, 10));
    handoff.set("coverType", candidate.detectedType === "MEDLEY" ? "MEDLEY" : "KARAOKE_STREAM");
    if (candidate.sourcePerformerId) {
      handoff.append("performerIds", candidate.sourcePerformerId);
    }
    redirect(`/admin/covers/bulk-new?${handoff.toString()}`);
  }

  const error = getSearchParam(query, "error");
  const alreadyProcessed = candidate.status !== "PENDING";

  const [performers, performerSuggestions, songSuggestions] = await Promise.all([
    getPerformerOptions(),
    findPerformerSuggestions({
      channelId: candidate.channelId,
      channelTitle: candidate.channelTitle,
      sourceTitle: candidate.title,
      description: candidate.description
    }),
    findSongSuggestions({ sourceTitle: candidate.title, description: candidate.description })
  ]);

  const defaultSelectedIds = Array.from(
    new Set([
      ...(candidate.sourcePerformerId ? [candidate.sourcePerformerId] : []),
      ...performerSuggestions.map((suggestion) => suggestion.id)
    ])
  );
  const publishedDate = candidate.publishedAt.toISOString().slice(0, 10);
  const topSong = songSuggestions[0];

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="歌唱記録候補の確定"
        description="推定結果を確認・修正してカバー記録を作成します。"
        actions={
          <Link href="/admin/cover-candidates" className="text-sm text-primary underline">
            候補一覧に戻る
          </Link>
        }
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>
      ) : null}
      {alreadyProcessed ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          この候補は既に「{candidate.status === "ADOPTED" ? "承認済み" : "除外済み"}」です。
        </div>
      ) : null}

      <section className="rounded-md border bg-card p-4">
        <Badge variant="default">{candidate.detectedType === "SHORT" ? "ショート" : "歌ってみた"}</Badge>
        <a
          href={candidate.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block font-semibold text-primary underline-offset-4 hover:underline"
        >
          {candidate.title}
        </a>
        <p className="mt-1 text-sm text-muted-foreground">
          {candidate.channelTitle} / {publishedDate}
        </p>
      </section>

      {!alreadyProcessed ? (
        <form action={adoptCoverVideoCandidateAction.bind(null, candidate.id)} className="space-y-5">
          <div className="rounded-md border bg-card p-5">
            <Label>動画URL</Label>
            <p className="mt-1 break-all text-sm text-muted-foreground">{candidate.videoUrl}</p>
          </div>

          <div className="grid gap-4 rounded-md border bg-card p-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="performedAt">歌唱日</Label>
              <Input id="performedAt" name="performedAt" type="date" required defaultValue={publishedDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverType">歌唱種別</Label>
              <Select
                id="coverType"
                name="coverType"
                required
                defaultValue={candidate.detectedType === "SHORT" ? "SHORT" : "COVER_VIDEO"}
              >
                {coverTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sourceTitle">ソースタイトル</Label>
              <Input id="sourceTitle" name="sourceTitle" defaultValue={candidate.title} />
            </div>
          </div>

          <div className="space-y-4 rounded-md border bg-card p-5">
            <div className="space-y-2">
              <Label>活動者</Label>
              <p className="text-xs text-muted-foreground">
                巡回元の活動者と、タイトル・概要欄からの推定結果を初期選択しています。
              </p>
              <PerformerPicker performers={performers} defaultSelectedIds={defaultSelectedIds} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="performerNames">活動者名を直接入力（任意）</Label>
              <Textarea
                id="performerNames"
                name="performerNames"
                placeholder="未登録の活動者を追加する場合。改行・カンマ区切り対応。"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-md border bg-card p-5">
            {songSuggestions.length > 0 ? (
              <div className="space-y-2">
                <Label>楽曲候補（クリックで反映）</Label>
                <SongSuggestionButtons suggestions={songSuggestions} />
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="songTitle">楽曲名</Label>
                <Input id="songTitle" name="songTitle" required defaultValue={topSong?.title ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artistNames">原曲アーティスト名</Label>
                <Input
                  id="artistNames"
                  name="artistNames"
                  required
                  placeholder="複数はカンマ区切り"
                  defaultValue={topSong?.artistNames.join(", ") ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              カバー記録として確定する
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
