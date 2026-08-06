"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Wand2 } from "lucide-react";

import { PerformerPicker } from "@/components/covers/performer-picker";
import { SongRowsEditor } from "@/components/covers/song-rows-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { coverTypeOptions, multiSongCoverTypes } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createBulkCoversAction } from "./actions";

type PerformerOption = { id: string; name: string; group: { name: string } | null };

export function BulkNewForm({
  performers,
  initial
}: {
  performers: PerformerOption[];
  initial: {
    sourceUrl: string;
    performedAt: string;
    coverType: string;
    performerIds: string[];
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    count: number;
    firstCoverId: string | null;
    continueHref: string | null;
  } | null>(null);

  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [performedAt, setPerformedAt] = useState(initial.performedAt);
  const [coverType, setCoverType] = useState(
    coverTypeOptions.some((option) => option.value === initial.coverType) ? initial.coverType : "KARAOKE_STREAM"
  );
  const [description, setDescription] = useState("");
  const [selectedPerformers, setSelectedPerformers] = useState<PerformerOption[]>(() =>
    performers.filter((performer) => initial.performerIds.includes(performer.id))
  );

  const isMulti = multiSongCoverTypes.has(coverType);

  async function fetchMetadata() {
    setError(null);
    setMessage(null);
    if (!sourceUrl.trim()) {
      setError("情報元URLを入力してください。");
      return;
    }
    try {
      const response = await fetch("/api/youtube/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setError(data.error ?? "動画情報の取得に失敗しました。");
        return;
      }
      const meta = data.metadata;
      if (meta.sourceTitle) setSourceTitle(meta.sourceTitle);
      if (meta.publishedDate) setPerformedAt(meta.publishedDate);
      if (meta.thumbnailUrl) setSourceImageUrl(meta.thumbnailUrl);
      setDescription(meta.description ?? "");
      setMessage("動画情報を取得しました。概要欄にセットリストがあれば「読み取る」で曲リストを生成できます。");
    } catch {
      setError("動画情報の取得に失敗しました。");
    }
  }

  function submit(form: HTMLFormElement) {
    setError(null);
    setMessage(null);
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createBulkCoversAction(formData);
      if (result.ok) {
        let continueHref: string | null = null;
        if (result.continueInfo) {
          const params = new URLSearchParams();
          params.set("sourceUrl", result.continueInfo.sourceUrl);
          if (result.continueInfo.sourceTitle) {
            params.set("sourceTitle", result.continueInfo.sourceTitle);
          }
          params.set("performedAt", result.continueInfo.performedAt);
          params.set("coverType", result.continueInfo.coverType);
          for (const id of result.continueInfo.performerIds) {
            params.append("performerIds", id);
          }
          continueHref = `/admin/covers/bulk-new?${params.toString()}`;
        }
        setSuccessInfo({ count: result.count, firstCoverId: result.firstCoverId, continueHref });
      } else {
        setError(result.error);
      }
    });
  }

  if (successInfo) {
    return (
      <div className="space-y-4 rounded-md border border-secondary/40 bg-secondary/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary-foreground" aria-hidden="true" />
          <div>
            <p className="font-semibold">{successInfo.count}曲を登録しました。</p>
            <p className="mt-1 text-sm text-muted-foreground">
              続けて同じ動画から追加するか、歌唱記録管理に戻って内容を確認してください。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {successInfo.continueHref ? (
            <Link href={successInfo.continueHref} className={cn(buttonVariants())}>
              同じ動画から続けて追加
            </Link>
          ) : null}
          {successInfo.firstCoverId ? (
            <Link
              href={`/covers/${successInfo.firstCoverId}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              登録した歌唱記録を見る
            </Link>
          ) : null}
          <Link href="/admin/covers" className={cn(buttonVariants({ variant: "outline" }))}>
            歌唱記録管理に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
      className="space-y-6"
    >
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">{message}</div>
      ) : null}

      <section className="space-y-4 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">共通情報</h2>
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">情報元URL</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="sourceUrl"
              name="sourceUrl"
              type="url"
              required
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              className="flex-1"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <Button type="button" variant="outline" onClick={fetchMetadata}>
              <Wand2 className="size-4" aria-hidden="true" />
              動画情報を取得
            </Button>
          </div>
          <input type="hidden" name="sourceImageUrl" value={sourceImageUrl} />
        </div>

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
