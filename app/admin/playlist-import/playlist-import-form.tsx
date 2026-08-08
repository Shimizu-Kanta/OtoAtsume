"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorBanner, InfoNote } from "@/components/ui/notice";
import type { CrawlMode } from "@/lib/crawl/cover-candidates";
import type { PlaylistImportPreview, PlaylistImportPreviewItem } from "@/lib/crawl/playlist-import";
import { cn, formatDate } from "@/lib/utils";
import { importPlaylistAction, previewPlaylistAction } from "./actions";

type ImportSummary = {
  created: number;
  skippedAlreadyKnown: number;
  skippedEstimationFailed: number;
  errors: string[];
};

function typeLabel(type: PlaylistImportPreviewItem["detectedType"]) {
  if (type === "KARAOKE_STREAM") return "歌枠";
  if (type === "MEDLEY") return "メドレー";
  if (type === "SHORT") return "ショート";
  return "歌ってみた";
}

function statusLabel(item: PlaylistImportPreviewItem) {
  if (item.status === "registered") {
    return `登録済み（${item.registeredCoverCount}件）`;
  }
  if (item.status === "candidateExists") {
    return "候補として登録済み";
  }
  return "未登録";
}

export function PlaylistImportForm() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [mode, setMode] = useState<CrawlMode>("COVER_VIDEO");
  const [preview, setPreview] = useState<PlaylistImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isFetching, startFetch] = useTransition();
  const [isImporting, startImport] = useTransition();

  const selectableCount = useMemo(
    () => preview?.items.filter((item) => item.status === "new").length ?? 0,
    [preview]
  );

  function handleFetch() {
    setError(null);
    setSummary(null);

    startFetch(async () => {
      const result = await previewPlaylistAction(playlistUrl, mode);

      if (!result.ok) {
        setPreview(null);
        setSelected(new Set());
        setError(result.error);
        return;
      }

      setPreview(result.preview);
      setSelected(
        new Set(result.preview.items.filter((item) => item.defaultSelected).map((item) => item.videoId))
      );
    });
  }

  function toggle(videoId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }

  function selectAllNew() {
    if (!preview) return;
    setSelected(new Set(preview.items.filter((item) => item.status === "new").map((item) => item.videoId)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleImport() {
    if (!preview) return;
    setError(null);

    // 「推定失敗でスキップ」はプレビュー側の情報から数える（サーバーには選択分しか送らないため）。
    const skippedEstimationFailed = preview.items.filter(
      (item) => item.status === "new" && !item.defaultSelected && !selected.has(item.videoId)
    ).length;

    startImport(async () => {
      const result = await importPlaylistAction(Array.from(selected), preview.mode);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSummary({
        created: result.created,
        skippedAlreadyKnown: result.skippedAlreadyKnown,
        skippedEstimationFailed,
        errors: result.errors
      });

      // 取り込み済みの動画は「候補として登録済み」になるため、状態を反映して選択を解除する。
      setPreview((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                selected.has(item.videoId) && item.status === "new"
                  ? { ...item, status: "candidateExists", defaultSelected: false }
                  : item
              )
            }
          : current
      );
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-3xl border border-rule bg-panel p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="playlistUrl">プレイリストURL</Label>
            <Input
              id="playlistUrl"
              name="playlistUrl"
              value={playlistUrl}
              onChange={(event) => setPlaylistUrl(event.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode">取り込みモード</Label>
            <Select
              id="mode"
              name="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as CrawlMode)}
            >
              <option value="COVER_VIDEO">歌ってみた</option>
              <option value="KARAOKE_STREAM">歌枠・ライブ</option>
            </Select>
          </div>
          <Button type="button" onClick={handleFetch} disabled={isFetching || !playlistUrl.trim()}>
            {isFetching ? "取得中..." : "動画を取得"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          1回の取り込みで最大 {200} 件まで取得します。取得しただけでは登録されません。次の確認画面で選んだ動画のみが候補になります。
        </p>
      </div>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      {summary ? (
        <div className="space-y-1 rounded-3xl border border-secondary/40 bg-secondary/10 p-5 text-sm">
          <p className="font-semibold">取り込み結果</p>
          <p>取り込み成功: {summary.created}件</p>
          <p>スキップ（登録済み）: {summary.skippedAlreadyKnown}件</p>
          <p>スキップ（推定失敗）: {summary.skippedEstimationFailed}件</p>
          <p>エラー: {summary.errors.length}件</p>
          {summary.errors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">
              {summary.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
          {summary.created > 0 ? (
            <Link
              href="/admin/cover-candidates"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
            >
              歌唱記録候補を確認する
            </Link>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-4">
          {preview.truncated ? (
            <InfoNote>上限に達したため先頭{200}件のみ取得しました。</InfoNote>
          ) : null}
          {preview.skippedUnavailable > 0 ? (
            <InfoNote>
              非公開・削除済みの動画 {preview.skippedUnavailable} 件はスキップしました。
            </InfoNote>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-rule bg-panel p-4 shadow-sm">
            <div className="text-sm">
              <p>
                取得 <span className="font-semibold">{preview.items.length}</span> 件 / 未登録{" "}
                <span className="font-semibold">{selectableCount}</span> 件 / 選択中{" "}
                <span className="font-semibold">{selected.size}</span> 件
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                未処理候補 {preview.currentPending} 件 / あと {preview.remainingCapacity} 件まで追加できます
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={selectAllNew}>
                未登録をすべて選択
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                選択を解除
              </Button>
              <Button type="button" onClick={handleImport} disabled={isImporting || selected.size === 0}>
                {isImporting ? "登録中..." : `選択した${selected.size}件を候補として登録`}
              </Button>
            </div>
          </div>

          {preview.items.length > 0 ? (
            <ul className="grid gap-4 lg:grid-cols-2">
              {preview.items.map((item) => {
                const checked = selected.has(item.videoId);
                const disabled = item.status !== "new";

                return (
                  <li
                    key={item.videoId}
                    className={cn(
                      "overflow-hidden rounded-3xl border bg-panel shadow-sm transition-colors",
                      checked ? "border-primary/50" : "border-rule",
                      disabled ? "opacity-70" : ""
                    )}
                  >
                    <div className="flex gap-3 p-4">
                      <label className="flex shrink-0 items-start pt-1">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(item.videoId)}
                          aria-label={`${item.title}を取り込む`}
                        />
                      </label>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={item.detectedType === "KARAOKE_STREAM" ? "accent" : "default"}>
                            {typeLabel(item.detectedType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(item.publishedAt)}</span>
                          <span
                            className={cn(
                              "text-xs font-medium",
                              item.status === "new" ? "text-muted-foreground" : "text-primary"
                            )}
                          >
                            {statusLabel(item)}
                          </span>
                        </div>

                        <div className="flex gap-3">
                          {item.thumbnailUrl ? (
                            <a href={item.videoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                              <Image
                                src={item.thumbnailUrl}
                                alt={item.title}
                                width={160}
                                height={90}
                                unoptimized
                                className="aspect-video w-28 rounded-md object-cover"
                              />
                            </a>
                          ) : null}
                          <div className="min-w-0">
                            <a
                              href={item.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-sm font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                            >
                              {item.title}
                            </a>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{item.channelTitle}</p>
                          </div>
                        </div>

                        <dl className="space-y-1 border-t pt-2 text-xs">
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-muted-foreground">活動者候補:</dt>
                            <dd className="min-w-0">
                              {item.performerSuggestions.length > 0
                                ? item.performerSuggestions
                                    .slice(0, 3)
                                    .map((performer) => performer.name)
                                    .join(" / ")
                                : "—"}
                            </dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-muted-foreground">楽曲候補:</dt>
                            <dd className="min-w-0">
                              {item.songSuggestions.length > 0
                                ? item.songSuggestions
                                    .slice(0, 3)
                                    .map((song) =>
                                      song.artistNames.length > 0
                                        ? `${song.title}（${song.artistNames.join(", ")}）`
                                        : song.title
                                    )
                                    .join(" / ")
                                : "—"}
                            </dd>
                          </div>
                        </dl>

                        {item.notes.length > 0 ? (
                          <p className="text-xs text-[color:var(--signal)]">{item.notes.join(" / ")}</p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-3xl border border-rule bg-panel p-6 text-sm text-muted-foreground shadow-sm">
              取り込める動画が見つかりませんでした。
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
