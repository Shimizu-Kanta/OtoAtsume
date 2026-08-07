"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PerformerPicker } from "@/components/covers/performer-picker";
import { SongRowsEditor } from "@/components/covers/song-rows-editor";
import { YouTubeMetadataFetcher } from "@/components/covers/youtube-metadata-fetcher";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { coverTypeOptions, multiSongCoverTypes } from "@/lib/constants";
import { cn, formatSeconds } from "@/lib/utils";
import { createBulkCoversAction, type BulkCoverPreviewItem } from "./actions";

type PerformerOption = { id: string; name: string; group: { name: string } | null };

export function BulkNewForm({
  performers,
  initial,
  autoFetchMetadata
}: {
  performers: PerformerOption[];
  initial: {
    sourceUrl: string;
    performedAt: string;
    coverType: string;
    performerIds: string[];
  };
  autoFetchMetadata: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    count: number;
    sourceUrl: string | null;
    preview: BulkCoverPreviewItem[];
  } | null>(null);

  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [sourceTitle, setSourceTitle] = useState("");
  const [performedAt, setPerformedAt] = useState(initial.performedAt);
  const [coverType, setCoverType] = useState(
    coverTypeOptions.some((option) => option.value === initial.coverType) ? initial.coverType : "KARAOKE_STREAM"
  );
  const [description, setDescription] = useState("");
  const [selectedPerformers, setSelectedPerformers] = useState<PerformerOption[]>(() =>
    performers.filter((performer) => initial.performerIds.includes(performer.id))
  );

  const isMulti = multiSongCoverTypes.has(coverType);

  // YouTube URL補助（YouTubeMetadataFetcher）が概要欄を取得したら、セットリスト
  // 読み取りボタン（SongRowsEditor）で使えるように受け取る。公開フォームと同じ仕組み。
  useEffect(() => {
    function handleMetadataLoaded(event: Event) {
      const customEvent = event as CustomEvent<{ description?: string }>;
      setDescription(customEvent.detail?.description ?? "");
    }

    window.addEventListener("otoatsume:metadata-loaded", handleMetadataLoaded);
    return () => window.removeEventListener("otoatsume:metadata-loaded", handleMetadataLoaded);
  }, []);

  function submit(form: HTMLFormElement) {
    setError(null);
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createBulkCoversAction(formData);
      if (result.ok) {
        setSuccessInfo({ count: result.count, sourceUrl: result.sourceUrl, preview: result.preview });
      } else {
        setError(result.error);
      }
    });
  }

  if (successInfo) {
    const continueHref = successInfo.sourceUrl
      ? `/admin/covers/bulk-new?sourceUrl=${encodeURIComponent(successInfo.sourceUrl)}&autoFetch=1`
      : null;

    return (
      <div className="space-y-6">
        <div className="space-y-4 rounded-md border border-secondary/40 bg-secondary/10 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary-foreground" aria-hidden="true" />
            <p className="font-semibold">{successInfo.count}曲を登録しました。</p>
          </div>

          <div className="overflow-hidden rounded-md border bg-card">
            <div className="divide-y">
              {successInfo.preview.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                    {item.timestampSeconds != null ? formatSeconds(item.timestampSeconds) : "-"}
                  </span>
                  <Link
                    href={`/covers/${item.id}`}
                    className="min-w-0 flex-1 truncate font-medium underline-offset-4 hover:underline"
                  >
                    {item.songTitle}
                  </Link>
                  <span className="shrink-0 truncate text-xs text-muted-foreground">
                    {item.performerNames.join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/covers" className={cn(buttonVariants({ variant: "outline" }))}>
            歌唱記録管理に戻る
          </Link>
          <Link href="/admin/covers/bulk-new" className={cn(buttonVariants({ variant: "outline" }))}>
            新しいURLで記録を追加
          </Link>
          {continueHref ? (
            <Link href={continueHref} className={cn(buttonVariants())}>
              同じURLで記録を追加
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form
      id="cover-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
      className="space-y-6"
    >
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>
      ) : null}

      <section className="space-y-4 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">共通情報</h2>
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">情報元URL</Label>
          <Input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            required
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {/* sourceImageUrl は YouTube URL補助がネイティブ value セッター経由で書き込む。
              React 側で value 制御すると、補助が書き込んだ直後の再描画で古い値に
              巻き戻ってしまうため、あえて非制御のまま name 属性だけで送信する。 */}
          <input type="hidden" name="sourceImageUrl" />
        </div>

        <YouTubeMetadataFetcher autoFetch={autoFetchMetadata} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sourceTitle">配信・動画・ライブ名</Label>
            <Input
              id="sourceTitle"
              name="sourceTitle"
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverType">歌唱種別</Label>
            <Select
              id="coverType"
              name="coverType"
              value={coverType}
              onChange={(event) => setCoverType(event.target.value)}
            >
              {coverTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="performedAt">歌唱日</Label>
            <Input
              id="performedAt"
              name="performedAt"
              type="date"
              required
              value={performedAt}
              onChange={(event) => setPerformedAt(event.target.value)}
            />
            {coverType === "LIVE_EVENT" ? (
              <p className="text-xs text-amber-600">
                動画の投稿日と実際の開催日が異なる場合があります。開催日を確認して入力してください。
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>共通の活動者</Label>
          <PerformerPicker
            performers={performers}
            defaultSelectedIds={initial.performerIds}
            onSelectionChange={setSelectedPerformers}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">{isMulti ? "曲リスト" : "楽曲"}</h2>
        <SongRowsEditor
          key={isMulti ? "multi" : "single"}
          participants={selectedPerformers}
          description={description}
          singleRow={!isMulti}
        />
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "登録中..." : "まとめて登録"}
        </Button>
      </div>
    </form>
  );
}
