"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, LinkIcon, ListMusic, Music2, Send, Users } from "lucide-react";

import { TurnstileCaptcha } from "@/components/captcha/turnstile";
import { DuplicateCandidateChecker } from "@/components/covers/duplicate-candidate-checker";
import { FormSection } from "@/components/covers/form-section";
import { PerformerPicker, type PerformerOption } from "@/components/covers/performer-picker";
import { createEmptyRow, SongRowsEditor, type SongRow } from "@/components/covers/song-rows-editor";
import {
  YouTubeMetadataFetcher,
  type PerformerSuggestion,
  type SongSuggestion
} from "@/components/covers/youtube-metadata-fetcher";
import { SongPicker } from "@/components/song-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { coverTypeOptions, multiSongCoverTypes } from "@/lib/constants";
import type { CoverSubmitResult } from "@/lib/covers/submit-result";
import { cn, formatSeconds } from "@/lib/utils";

// 歌唱記録登録フォームの本体。公開（/covers/new）・管理画面（/admin/covers/bulk-new）の
// 両方から使う共通コンポーネント。差分は props（mode 他）で切り替える。
// フィールド名（songTitle/artistNames = 単曲、rowSongTitle 等 = 複数曲）はここで一元管理し、
// YouTubeMetadataFetcher 側は決め打ちのフィールド名を持たず、コールバック経由で反映先を委ねる。

const DEFAULT_COVER_TYPE = "COVER_VIDEO";
const CREATE_STATUS_OPTIONS = [
  { value: "PENDING", label: "確認待ち" },
  { value: "APPROVED", label: "公開" }
] as const;
const DEFAULT_STATUS = "APPROVED";

export type CoverRegistrationFormInitial = {
  sourceUrl: string;
  sourceTitle: string;
  performedAt: string;
  coverType: string;
  performerIds: string[];
  status?: string;
};

type CoverRegistrationFormProps = {
  mode: "public" | "admin";
  performers: PerformerOption[];
  initial: CoverRegistrationFormInitial;
  autoFetchMetadata?: boolean;
  maxRows?: number;
  showCaptcha?: boolean;
  captchaSiteKey?: string;
  captchaRequired?: boolean;
  showStatusField?: boolean;
  action: (formData: FormData) => Promise<CoverSubmitResult>;
};

function isRowEmpty(row: SongRow) {
  return !row.timestamp.trim() && !row.songTitle.trim() && !row.artistNames.trim();
}

export function CoverRegistrationForm({
  mode,
  performers,
  initial,
  autoFetchMetadata: initialAutoFetchMetadata = false,
  maxRows,
  showCaptcha = false,
  captchaSiteKey,
  captchaRequired = false,
  showStatusField = false,
  action
}: CoverRegistrationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CoverSubmitResult, { ok: true }> | null>(null);

  // フォーム再利用のたびに変える key。PerformerPicker・YouTubeMetadataFetcher は
  // 内部状態を自分で持つため、「新しいURLで記録を追加」等で完全に白紙へ戻すには
  // 明示的な key 変更で再マウントさせる必要がある。
  const [instanceKey, setInstanceKey] = useState(0);

  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [sourceTitle, setSourceTitle] = useState(initial.sourceTitle);
  const [performedAt, setPerformedAt] = useState(initial.performedAt);
  const [coverType, setCoverType] = useState(
    coverTypeOptions.some((option) => option.value === initial.coverType) ? initial.coverType : DEFAULT_COVER_TYPE
  );
  const [status, setStatus] = useState(initial.status ?? DEFAULT_STATUS);
  const [autoFetchMetadata, setAutoFetchMetadata] = useState(initialAutoFetchMetadata);
  const [performerPickerDefaultIds, setPerformerPickerDefaultIds] = useState(initial.performerIds);
  const [participants, setParticipants] = useState<PerformerOption[]>(() =>
    performers.filter((performer) => initial.performerIds.includes(performer.id))
  );
  const [description, setDescription] = useState("");

  // 単曲入力（種別を切り替えても入力内容は保持する）。
  const [songTitle, setSongTitle] = useState("");
  const [artistNames, setArtistNames] = useState("");
  // 複数曲入力。
  const [songRows, setSongRows] = useState<SongRow[]>(() => [createEmptyRow()]);

  const isMulti = multiSongCoverTypes.has(coverType);

  useEffect(() => {
    function handleMetadataLoaded(event: Event) {
      const customEvent = event as CustomEvent<{ description?: string }>;
      setDescription(customEvent.detail?.description ?? "");
    }

    window.addEventListener("otoatsume:metadata-loaded", handleMetadataLoaded);
    return () => window.removeEventListener("otoatsume:metadata-loaded", handleMetadataLoaded);
  }, []);

  function applySongSuggestion(song: SongSuggestion) {
    if (isMulti) {
      setSongRows((current) => {
        const first = current[0];
        if (first && isRowEmpty(first)) {
          return current.map((row, index) =>
            index === 0 ? { ...row, songTitle: song.title, artistNames: song.artistNames.join(", ") } : row
          );
        }
        if (maxRows != null && current.length >= maxRows) {
          return current;
        }
        return [...current, { ...createEmptyRow(), songTitle: song.title, artistNames: song.artistNames.join(", ") }];
      });
      return;
    }

    setSongTitle(song.title);
    setArtistNames(song.artistNames.join(", "));
  }

  function applyPerformerSuggestion(performer: PerformerSuggestion) {
    // PerformerPicker はグローバルイベントで選択IDの追加を受け取る（既存の仕組みをそのまま利用）。
    window.dispatchEvent(new CustomEvent("otoatsume:add-performer-id", { detail: { id: performer.id } }));
  }

  function resetForNewEntry(prefillSourceUrl?: string) {
    setResult(null);
    setError(null);
    setInstanceKey((key) => key + 1);
    setSourceUrl(prefillSourceUrl ?? "");
    setSourceTitle("");
    setPerformedAt("");
    setCoverType(DEFAULT_COVER_TYPE);
    setStatus(DEFAULT_STATUS);
    setAutoFetchMetadata(Boolean(prefillSourceUrl));
    setPerformerPickerDefaultIds([]);
    setParticipants([]);
    setDescription("");
    setSongTitle("");
    setArtistNames("");
    setSongRows([createEmptyRow()]);

    const query = prefillSourceUrl
      ? `?sourceUrl=${encodeURIComponent(prefillSourceUrl)}&autoFetch=1`
      : "";
    router.push(`/admin/covers/bulk-new${query}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const submitResult = await action(formData);

      if (!submitResult.ok) {
        setError(submitResult.error);
        return;
      }

      if (mode === "public") {
        router.push(`/covers/${submitResult.coverIds[0]}?created=1`);
        return;
      }

      setResult(submitResult);
    });
  }

  if (mode === "admin" && result) {
    return <AdminSuccessScreen result={result} onContinueSameUrl={resetForNewEntry} />;
  }

  return (
    <form id="cover-form" onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <FormSection
        icon={<LinkIcon className="size-4" aria-hidden="true" />}
        title="1. 情報元"
        description="動画・配信・ライブなど、歌唱記録の根拠になるURLを入力します。YouTube URLの場合は補助機能で一部項目を自動入力できます。"
      >
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
          <input key={instanceKey} type="hidden" name="sourceImageUrl" />
        </div>
        <YouTubeMetadataFetcher
          key={instanceKey}
          autoFetch={autoFetchMetadata}
          onSongSuggestionApply={applySongSuggestion}
          onPerformerSuggestionApply={applyPerformerSuggestion}
        />
      </FormSection>

      <FormSection
        icon={<Users className="size-4" aria-hidden="true" />}
        title="2. 活動者と楽曲"
        description="既存の活動者を選ぶか、未登録の活動者名を直接入力してください。歌枠・ライブ・メドレーは1つのURLに複数曲を登録できます。"
      >
        <div className="space-y-2">
          <Label htmlFor="coverType">歌唱種別</Label>
          <Select
            id="coverType"
            name="coverType"
            required
            value={coverType}
            onChange={(event) => setCoverType(event.target.value)}
          >
            {coverTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {isMulti ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ListMusic className="size-3.5" aria-hidden="true" />
              1つのアーカイブ（配信・ライブ）から複数曲をまとめて登録できます。
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="performerIds">既存の活動者</Label>
            <PerformerPicker
              key={instanceKey}
              performers={performers}
              defaultSelectedIds={performerPickerDefaultIds}
              onSelectionChange={setParticipants}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="performerNames">活動者名を直接入力</Label>
            <Textarea
              key={instanceKey}
              id="performerNames"
              name="performerNames"
              placeholder="未登録の活動者や複数名を入力できます。改行・カンマ区切り対応。"
            />
            <p className="text-xs text-muted-foreground">
              ここに入力した活動者は、複数曲の場合すべての曲に共通で登録されます。
            </p>
          </div>
        </div>

        {isMulti ? (
          <SongRowsEditor
            rows={songRows}
            onRowsChange={setSongRows}
            participants={participants}
            description={description}
            maxRows={maxRows}
          />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="songTitle">楽曲名・原曲アーティスト</Label>
            <SongPicker
              titleId="songTitle"
              titleName="songTitle"
              artistName="artistNames"
              title={songTitle}
              artistNames={artistNames}
              onTitleChange={setSongTitle}
              onArtistNamesChange={setArtistNames}
            />
          </div>
        )}
      </FormSection>

      <FormSection
        icon={<Music2 className="size-4" aria-hidden="true" />}
        title="3. 歌唱情報"
        description="歌唱日・動画タイトルなどを入力します。複数曲の場合、開始位置は曲ごとのタイムスタンプで登録します。"
      >
        <div className="grid gap-4 md:grid-cols-2">
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
          <div className="space-y-2">
            <Label htmlFor="sourceTitle">配信・動画・ライブ名</Label>
            <Input
              id="sourceTitle"
              name="sourceTitle"
              placeholder={mode === "public" ? "任意" : undefined}
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
            />
          </div>
          {!isMulti ? (
            <div className="space-y-2">
              <Label htmlFor="timestampSeconds">タイムスタンプ秒数</Label>
              <Input
                key={instanceKey}
                id="timestampSeconds"
                name="timestampSeconds"
                type="number"
                min="0"
                placeholder="例: 1234"
              />
            </div>
          ) : null}
          {showStatusField ? (
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select id="status" name="status" required value={status} onChange={(event) => setStatus(event.target.value)}>
                {CREATE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        icon={<ClipboardList className="size-4" aria-hidden="true" />}
        title="4. 登録前の確認"
        description="重複候補を確認し、必要に応じてCAPTCHAを完了してから登録してください。"
      >
        <DuplicateCandidateChecker />
        {showCaptcha ? <TurnstileCaptcha siteKey={captchaSiteKey} required={captchaRequired} /> : null}
        <div className="flex flex-col gap-3 rounded-3xl border border-primary/10 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">内容を確認して登録</p>
            {mode === "public" ? (
              <p className="mt-1 text-sm text-muted-foreground">登録後、公開前に管理側で内容を確認します。</p>
            ) : null}
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
            <Send className="size-4" aria-hidden="true" />
            {isPending ? "登録中..." : "登録する"}
          </Button>
        </div>
      </FormSection>
    </form>
  );
}

function AdminSuccessScreen({
  result,
  onContinueSameUrl
}: {
  result: Extract<CoverSubmitResult, { ok: true }>;
  onContinueSameUrl: (prefillSourceUrl?: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-md border border-secondary/40 bg-secondary/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary-foreground" aria-hidden="true" />
          <p className="font-semibold">{result.preview.length}曲を登録しました。</p>
        </div>

        <div className="overflow-hidden rounded-md border bg-card">
          <div className="divide-y">
            {result.preview.map((item) => (
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
        <button
          type="button"
          onClick={() => onContinueSameUrl(undefined)}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          新しいURLで記録を追加
        </button>
        {result.sourceUrl ? (
          <button type="button" onClick={() => onContinueSameUrl(result.sourceUrl ?? undefined)} className={cn(buttonVariants())}>
            同じURLで記録を追加
          </button>
        ) : null}
      </div>
    </div>
  );
}
