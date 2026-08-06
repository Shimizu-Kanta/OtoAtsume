"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";

import { PerformerSelectorChips } from "@/components/performer-selector-chips";
import { SongPicker } from "@/components/song-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseSetlistFromDescription } from "@/lib/setlist-parser";
import { formatSeconds } from "@/lib/utils";

type Participant = { id: string; name: string };

export type SongRow = {
  key: number;
  timestamp: string;
  songTitle: string;
  artistNames: string;
};

let rowKeySeed = 0;
export function createEmptyRow(): SongRow {
  rowKeySeed += 1;
  return { key: rowKeySeed, timestamp: "", songTitle: "", artistNames: "" };
}

// タイムスタンプらしき行（0:00 / 1:23:45 など）が概要欄にあるかどうか。
function hasTimestampLines(description: string) {
  return /\d{1,2}:\d{2}/.test(description);
}

// 「1つの動画URLから複数曲」を編集する共通の曲リスト。
// 公開フォーム・管理画面フォームの両方から使う。
// 送信フィールド: rowTimestamp / rowSongTitle / rowArtistNames / rowPerformerIds（行ごとに1つずつ）。
//
// singleRow: 歌ってみた動画・ショート・その他など、1曲のみの歌唱種別用。
// 曲の追加・削除・行番号・セットリスト一括読み取り（複数曲向け機能）を隠し、
// 常に1行だけを「1曲入力」の見た目で表示する。送信フィールド名は複数曲時と同じ
// （rowSongTitle 等）のまま1行分だけ出力するため、送信先の処理は変更不要。
export function SongRowsEditor({
  participants,
  description = "",
  maxRows,
  singleRow = false
}: {
  participants: Participant[];
  description?: string;
  maxRows?: number;
  singleRow?: boolean;
}) {
  const [rows, setRows] = useState<SongRow[]>(() => [createEmptyRow()]);
  const [notice, setNotice] = useState<string | null>(null);

  const hasTimestampedDescription = useMemo(() => hasTimestampLines(description), [description]);
  const canParseSetlist = !singleRow && hasTimestampedDescription;
  const effectiveMaxRows = singleRow ? 1 : maxRows;
  const reachedLimit = effectiveMaxRows != null && rows.length >= effectiveMaxRows;

  function updateRow(key: number, patch: Partial<SongRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (reachedLimit) {
      return;
    }
    setRows((current) => [...current, createEmptyRow()]);
  }

  function removeRow(key: number) {
    setRows((current) => {
      const next = current.filter((row) => row.key !== key);
      return next.length > 0 ? next : [createEmptyRow()];
    });
  }

  function parseSetlist() {
    setNotice(null);
    const parsed = parseSetlistFromDescription(description);
    if (parsed.length === 0) {
      setNotice("概要欄からタイムスタンプ付きの行を検出できませんでした。手入力してください。");
      return;
    }

    const hasContent = rows.some((row) => row.timestamp || row.songTitle || row.artistNames);
    if (hasContent && !window.confirm("入力済みの曲リストを、概要欄から読み取った内容で置き換えます。よろしいですか？")) {
      return;
    }

    const limited = maxRows != null ? parsed.slice(0, maxRows) : parsed;
    setRows(
      limited.map((row) => ({
        key: (rowKeySeed += 1),
        timestamp: formatSeconds(row.timestampSeconds),
        songTitle: row.songTitleGuess,
        artistNames: ""
      }))
    );

    const omitted = parsed.length - limited.length;
    setNotice(
      `${limited.length}行を読み込みました。曲でない行（オープニング・MC等）は削除し、` +
        `アーティスト名や歌唱者を確認してから登録してください。` +
        (omitted > 0 ? `（上限 ${maxRows} 行を超えた ${omitted} 行は読み込みませんでした）` : "")
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {singleRow
            ? "楽曲情報を入力してください。歌唱者は共通の活動者から選べます。"
            : "タイムスタンプ付きで曲ごとに登録します。歌唱者は共通の活動者から曲ごとに選べます。"}
        </p>
        {canParseSetlist ? (
          <Button type="button" variant="outline" size="sm" onClick={parseSetlist}>
            <Sparkles className="size-4" aria-hidden="true" />
            概要欄からセットリストを読み取る
          </Button>
        ) : null}
      </div>

      {notice ? (
        <p className="rounded-md border border-secondary/40 bg-secondary/10 p-2 text-xs">{notice}</p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.key} className="space-y-3 rounded-md border p-3">
            {!singleRow ? (
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{index + 1}曲目</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${index + 1}曲目を削除`}
                  onClick={() => removeRow(row.key)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-[130px_1fr]">
              <div className="space-y-1">
                <Label className="text-xs">タイムスタンプ</Label>
                <input
                  name="rowTimestamp"
                  value={row.timestamp}
                  onChange={(event) => updateRow(row.key, { timestamp: event.target.value })}
                  placeholder="1:23:45"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">楽曲名・原曲アーティスト</Label>
                <SongPicker
                  titleName="rowSongTitle"
                  artistName="rowArtistNames"
                  title={row.songTitle}
                  artistNames={row.artistNames}
                  onTitleChange={(value) => updateRow(row.key, { songTitle: value })}
                  onArtistNamesChange={(value) => updateRow(row.key, { artistNames: value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">この曲の歌唱者</Label>
              {participants.length > 0 ? (
                <PerformerSelectorChips name="rowPerformerIds" participants={participants} />
              ) : (
                <>
                  <input type="hidden" name="rowPerformerIds" value="" />
                  <p className="text-xs text-muted-foreground">
                    共通の活動者を選ぶと、曲ごとに歌唱者を選べます。
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {!singleRow ? (
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={reachedLimit}>
            <Plus className="size-4" aria-hidden="true" />
            曲を追加
          </Button>
          {reachedLimit ? (
            <p className="text-xs text-muted-foreground">1度に登録できるのは最大 {maxRows} 曲までです。</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
