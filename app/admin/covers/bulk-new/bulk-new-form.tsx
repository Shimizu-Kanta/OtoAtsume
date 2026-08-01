"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";

import { PerformerPicker } from "@/components/covers/performer-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { parseSetlistFromDescription } from "@/lib/setlist-parser";
import { formatSeconds } from "@/lib/utils";
import { createBulkCoversAction } from "./actions";

type PerformerOption = { id: string; name: string; group: { name: string } | null };

type SongRow = {
  key: number;
  timestamp: string;
  songTitle: string;
  artistNames: string;
  performerNames: string;
};

const BULK_COVER_TYPES = [
  { value: "KARAOKE_STREAM", label: "歌枠" },
  { value: "LIVE_EVENT", label: "ライブ・イベント" },
  { value: "MEDLEY", label: "メドレー" }
];

let rowKeySeed = 0;
function emptyRow(): SongRow {
  rowKeySeed += 1;
  return { key: rowKeySeed, timestamp: "", songTitle: "", artistNames: "", performerNames: "" };
}

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [performedAt, setPerformedAt] = useState(initial.performedAt);
  const [coverType, setCoverType] = useState(
    BULK_COVER_TYPES.some((t) => t.value === initial.coverType) ? initial.coverType : "KARAOKE_STREAM"
  );
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<SongRow[]>(() => [emptyRow()]);

  function updateRow(key: number, patch: Partial<SongRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

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
      setMessage("動画情報を取得しました。「概要欄からセットリストを読み取る」で曲リストを生成できます。");
    } catch {
      setError("動画情報の取得に失敗しました。");
    }
  }

  function parseSetlist() {
    setError(null);
    if (!description) {
      setError("先に「動画情報を取得」を実行してください。概要欄が読み込まれていません。");
      return;
    }
    const parsed = parseSetlistFromDescription(description);
    if (parsed.length === 0) {
      setError("概要欄からタイムスタンプ付きの行を検出できませんでした。手入力してください。");
      return;
    }
    setRows(
      parsed.map((row) => ({
        key: (rowKeySeed += 1),
        timestamp: formatSeconds(row.timestampSeconds),
        songTitle: row.songTitleGuess,
        artistNames: "",
        performerNames: ""
      }))
    );
    setMessage(
      `${parsed.length}行を読み込みました。曲でない行（オープニング・MC等）は削除し、内容を確認してから登録してください。`
    );
  }

  function submit(form: HTMLFormElement) {
    setError(null);
    setMessage(null);
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createBulkCoversAction(formData);
      if (result.ok) {
        if (result.firstCoverId) {
          router.push(`/covers/${result.firstCoverId}?created=1`);
        } else {
          router.push("/admin/covers");
        }
      } else {
        setError(result.error);
      }
    });
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
              {BULK_COVER_TYPES.map((option) => (
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
          <PerformerPicker performers={performers} defaultSelectedIds={initial.performerIds} />
        </div>
      </section>

      <section className="space-y-4 rounded-md border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">曲リスト</h2>
          <Button type="button" variant="outline" size="sm" onClick={parseSetlist}>
            <Sparkles className="size-4" aria-hidden="true" />
            概要欄からセットリストを読み取る
          </Button>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.key} className="grid gap-2 rounded-md border p-3 md:grid-cols-[110px_1fr_1fr_1fr_auto]">
              <div className="space-y-1">
                <Label className="text-xs">タイムスタンプ</Label>
                <Input
                  name="rowTimestamp"
                  value={row.timestamp}
                  onChange={(event) => updateRow(row.key, { timestamp: event.target.value })}
                  placeholder="1:23:45"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">楽曲名</Label>
                <Input
                  name="rowSongTitle"
                  value={row.songTitle}
                  onChange={(event) => updateRow(row.key, { songTitle: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">原曲アーティスト</Label>
                <Input
                  name="rowArtistNames"
                  value={row.artistNames}
                  onChange={(event) => updateRow(row.key, { artistNames: event.target.value })}
                  placeholder="複数はカンマ区切り"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">個別活動者（任意）</Label>
                <Input
                  name="rowPerformerNames"
                  value={row.performerNames}
                  onChange={(event) => updateRow(row.key, { performerNames: event.target.value })}
                  placeholder="空なら共通"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${index + 1}行目を削除`}
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={() => setRows((current) => [...current, emptyRow()])}>
          <Plus className="size-4" aria-hidden="true" />
          行を追加
        </Button>
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "登録中..." : "まとめて登録"}
        </Button>
      </div>
    </form>
  );
}
