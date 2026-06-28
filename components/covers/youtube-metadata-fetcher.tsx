"use client";

import { useState } from "react";
import { ExternalLink, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type YouTubeMetadata = {
  videoId: string;
  canonicalUrl: string;
  timestampSeconds?: number;
  sourceTitle: string;
  description: string;
  publishedAt: string;
  publishedDate: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  tags: string[];
  cache: "hit" | "miss" | "refresh";
};

type PerformerSuggestion = {
  id: string;
  name: string;
  groupName: string | null;
  reason: "channel" | "title" | "description" | "url";
};

type SongSuggestion = {
  id: string;
  title: string;
  artistNames: string[];
  reason: "title" | "description" | "artist";
};

type YouTubeMetadataSuggestions = {
  performers: PerformerSuggestion[];
  songs: SongSuggestion[];
};

type ApiResponse =
  | {
      metadata: YouTubeMetadata;
      suggestions: YouTubeMetadataSuggestions;
    }
  | {
      error: string;
    };

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { 
        status: "success"; 
        metadata: YouTubeMetadata;
        suggestions: YouTubeMetadataSuggestions; 
    }
  | { status: "error"; message: string };

export function YouTubeMetadataFetcher() {
  const [state, setState] = useState<FetchState>({ status: "idle" });

  async function fetchMetadata() {
    const form = document.getElementById("cover-form");

    if (!(form instanceof HTMLFormElement)) {
      setState({ status: "error", message: "フォームを確認できませんでした。" });
      return;
    }

    const sourceUrl = getFormValue(form, "sourceUrl");

    if (!sourceUrl) {
      setState({ status: "error", message: "情報元URLを入力してください。" });
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch("/api/youtube/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: sourceUrl })
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || "error" in data) {
        setState({
          status: "error",
          message: "error" in data ? data.error : "YouTube動画情報の取得に失敗しました。"
        });
        return;
      }

      applyMetadataToForm(form, data.metadata);
      setState({ 
        status: "success", 
        metadata: data.metadata, 
        suggestions: data.suggestions 
    });
    } catch (error) {
      console.error("YouTube metadata fetcher failed", error);
      setState({
        status: "error",
        message: "YouTube動画情報の取得に失敗しました。"
      });
    }
  }

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">YouTube URL補助</p>
          <p className="mt-1 text-sm text-muted-foreground">
            情報元URLから動画タイトル・投稿日・タイムスタンプを取得してフォームに反映します。
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={fetchMetadata}
          disabled={state.status === "loading"}
        >
          <Wand2 className="size-4" />
          {state.status === "loading" ? "取得中" : "URLから取得"}
        </Button>
      </div>

      {state.status === "error" ? (
        <p className="mt-3 text-sm text-destructive">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <div className="mt-4 rounded-md border border-secondary/50 bg-secondary/10 p-3 text-sm">
          <p className="font-medium">YouTube動画情報を反映しました。</p>

          <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr]">
            {state.metadata.thumbnailUrl ? (
              <img
                src={state.metadata.thumbnailUrl}
                alt=""
                className="aspect-video w-full rounded-md border object-cover"
              />
            ) : null}

            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium">{state.metadata.sourceTitle}</p>
                {state.metadata.cache ? (
                <p className="text-xs text-muted-foreground">
                    取得元: {cacheLabel(state.metadata.cache)}
                </p>
                ) : null}
              <a
                href={state.metadata.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary underline"
              >
                YouTubeで開く
                <ExternalLink className="size-3" />
              </a>
            </div>
            {state.suggestions.performers.length > 0 ? (
            <div className="mt-4 rounded-md border bg-background p-3">
                <p className="text-sm font-medium">活動者候補</p>
                <div className="mt-3 space-y-2">
                {state.suggestions.performers.map((performer) => (
                    <div
                    key={performer.id}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                    <div className="min-w-0">
                        <p className="font-medium">{performer.name}</p>
                        <p className="text-xs text-muted-foreground">
                        {performer.groupName ?? "所属なし"} / {performerReasonLabel(performer.reason)}から推定
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPerformerToPicker(performer.id)}
                    >
                        既存活動者に追加
                    </Button>
                    </div>
                ))}
                </div>
            </div>
            ) : (
            <p className="mt-4 text-sm text-muted-foreground">
                活動者候補は見つかりませんでした。
            </p>
            )}
            {state.suggestions.songs.length > 0 ? (
            <div className="mt-4 rounded-md border bg-background p-3">
                <p className="text-sm font-medium">楽曲候補</p>
                <div className="mt-3 space-y-2">
                {state.suggestions.songs.map((song) => (
                    <div
                    key={song.id}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                    <div className="min-w-0">
                        <p className="font-medium">{song.title}</p>
                        <p className="text-xs text-muted-foreground">
                        {song.artistNames.length > 0 ? song.artistNames.join(", ") : "アーティスト未登録"} /{" "}
                        {songReasonLabel(song.reason)}から推定
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applySongSuggestionToForm(song)}
                    >
                        楽曲情報に反映
                    </Button>
                    </div>
                ))}
                </div>
            </div>
            ) : (
            <p className="mt-4 text-sm text-muted-foreground">
                楽曲候補は見つかりませんでした。
            </p>
            )}

          </div>
        </div>
      ) : null}
    </div>
  );
}

function getFormValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    return field.value.trim();
  }

  return "";
}

function setFormValue(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function addPerformerToPicker(id: string) {
  window.dispatchEvent(
    new CustomEvent("otoatsume:add-performer-id", {
      detail: { id }
    })
  );
}

function applySongSuggestionToForm(song: SongSuggestion) {
  const form = document.getElementById("cover-form");

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  setFormValue(form, "songTitle", song.title);
  setFormValue(form, "artistNames", song.artistNames.join(", "));
}

function songReasonLabel(reason: SongSuggestion["reason"]) {
  if (reason === "title") {
    return "動画タイトル";
  }

  if (reason === "description") {
    return "概要欄";
  }

  if (reason === "artist") {
    return "楽曲名・アーティスト名";
  }

  return reason;
}

function performerReasonLabel(reason: PerformerSuggestion["reason"]) {
  if (reason === "url") {
    return "チャンネルURL";
  }

  if (reason === "channel") {
    return "チャンネル名";
  }

  if (reason === "title") {
    return "動画タイトル";
  }

  if (reason === "description") {
    return "概要欄";
  }

  return reason;
}

function applyMetadataToForm(form: HTMLFormElement, metadata: YouTubeMetadata) {
  setFormValue(form, "sourceUrl", metadata.canonicalUrl);
  setFormValue(form, "sourceTitle", metadata.sourceTitle);
  setFormValue(form, "performedAt", metadata.publishedDate);

  if (metadata.timestampSeconds !== undefined) {
    setFormValue(form, "timestampSeconds", String(metadata.timestampSeconds));
  }
}

function cacheLabel(cache: NonNullable<YouTubeMetadata["cache"]>) {
  if (cache === "hit") {
    return "DBキャッシュ";
  }

  if (cache === "miss") {
    return "YouTube API";
  }

  if (cache === "refresh") {
    return "YouTube APIで更新";
  }

  return cache;
}