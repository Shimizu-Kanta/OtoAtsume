"use client";

import { useEffect, useState } from "react";
import { ListMusic, Music2, Users } from "lucide-react";

import { FormSection } from "@/components/covers/form-section";
import { PerformerPicker } from "@/components/covers/performer-picker";
import { SongRowsEditor } from "@/components/covers/song-rows-editor";
import { SongPicker } from "@/components/song-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { coverTypeOptions } from "@/lib/constants";

type PerformerOption = { id: string; name: string; group: { name: string } | null };

// 複数曲をまとめて登録できる歌唱種別（1つのアーカイブに複数曲）。
const MULTI_SONG_TYPES = new Set(["KARAOKE_STREAM", "LIVE_EVENT", "MEDLEY"]);
const MAX_ROWS = 20;

export function PublicCoverFields({
  performers,
  initial
}: {
  performers: PerformerOption[];
  initial: {
    coverType: string;
    performerIds: string[];
    songTitle: string;
    artistNames: string;
    performedAt: string;
    sourceTitle: string;
  };
}) {
  const [coverType, setCoverType] = useState(initial.coverType);
  const [participants, setParticipants] = useState<PerformerOption[]>(() =>
    performers.filter((performer) => initial.performerIds.includes(performer.id))
  );
  const [description, setDescription] = useState("");
  // 単曲入力（種別を切り替えても入力内容は保持する）。
  const [songTitle, setSongTitle] = useState(initial.songTitle);
  const [artistNames, setArtistNames] = useState(initial.artistNames);

  const isMulti = MULTI_SONG_TYPES.has(coverType);

  useEffect(() => {
    function handleMetadataLoaded(event: Event) {
      const customEvent = event as CustomEvent<{ description?: string }>;
      setDescription(customEvent.detail?.description ?? "");
    }

    window.addEventListener("otoatsume:metadata-loaded", handleMetadataLoaded);
    return () => window.removeEventListener("otoatsume:metadata-loaded", handleMetadataLoaded);
  }, []);

  return (
    <>
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
              performers={performers}
              defaultSelectedIds={initial.performerIds}
              onSelectionChange={setParticipants}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="performerNames">活動者名を直接入力</Label>
            <Textarea
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
          <SongRowsEditor participants={participants} description={description} maxRows={MAX_ROWS} />
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
              defaultValue={initial.performedAt}
            />
            {coverType === "LIVE_EVENT" ? (
              <p className="text-xs text-amber-600">
                動画の投稿日と実際の開催日が異なる場合があります。開催日を確認して入力してください。
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceTitle">配信・動画・ライブ名</Label>
            <Input id="sourceTitle" name="sourceTitle" placeholder="任意" defaultValue={initial.sourceTitle} />
          </div>
          {!isMulti ? (
            <div className="space-y-2">
              <Label htmlFor="timestampSeconds">タイムスタンプ秒数</Label>
              <Input id="timestampSeconds" name="timestampSeconds" type="number" min="0" placeholder="例: 1234" />
            </div>
          ) : null}
        </div>
      </FormSection>
    </>
  );
}
