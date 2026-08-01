"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";

import { PerformerPicker } from "@/components/covers/performer-picker";
import { SongRowsEditor } from "@/components/covers/song-rows-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createBulkCoversAction } from "./actions";

type PerformerOption = { id: string; name: string; group: { name: string } | null };

const BULK_COVER_TYPES = [
  { value: "KARAOKE_STREAM", label: "歌枠" },
  { value: "LIVE_EVENT", label: "ライブ・イベント" },
  { value: "MEDLEY", label: "メドレー" }
];

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
  const [selectedPerformers, setSelectedPerformers] = useState<PerformerOption[]>(() =>
    performers.filter((performer) => initial.performerIds.includes(performer.id))
  );

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
          <PerformerPicker
            performers={performers}
            defaultSelectedIds={initial.performerIds}
            onSelectionChange={setSelectedPerformers}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">曲リスト</h2>
        <SongRowsEditor participants={selectedPerformers} description={description} />
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "登録中..." : "まとめて登録"}
        </Button>
      </div>
    </form>
  );
}
