import type { BulkCoverRow } from "@/lib/data/covers";
import { parseTimestampToSeconds } from "@/lib/utils";

export type ParseBulkCoverRowsResult = { ok: true; rows: BulkCoverRow[] } | { ok: false; error: string };

// 歌枠・ライブ・メドレーなど「1つのURLから複数曲」を送信する曲リストの FormData を
// 検証して取り出す。公開フォーム（/covers/new）・管理画面フォーム（/admin/covers/bulk-new）の
// 両方から使う共通ロジック。送信フィールド名は SongRowsEditor が出力する
// rowTimestamp / rowSongTitle / rowArtistNames / rowPerformerIds（行ごとに1つずつ）。
export function parseBulkCoverRowsFromFormData(
  formData: FormData,
  options: { commonPerformerIds: string[]; hasCommonPerformers: boolean; maxRows?: number }
): ParseBulkCoverRowsResult {
  const timestamps = formData.getAll("rowTimestamp").map(String);
  const songTitles = formData.getAll("rowSongTitle").map(String);
  const artistNamesList = formData.getAll("rowArtistNames").map(String);
  const performerIdsList = formData.getAll("rowPerformerIds").map(String);

  const rowCount = Math.max(
    timestamps.length,
    songTitles.length,
    artistNamesList.length,
    performerIdsList.length
  );

  const rows: BulkCoverRow[] = [];

  for (let i = 0; i < rowCount; i += 1) {
    const timestamp = (timestamps[i] ?? "").trim();
    const songTitle = (songTitles[i] ?? "").trim();
    const artistNames = (artistNamesList[i] ?? "").trim();
    const rowPerformerIds = (performerIdsList[i] ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    // 楽曲名・アーティスト・タイムスタンプがすべて空の行はスキップ
    // （歌唱者チップは共通の活動者を初期選択するため空行判定には含めない）。
    if (!timestamp && !songTitle && !artistNames) {
      continue;
    }

    if (!songTitle) {
      return { ok: false, error: `${i + 1}曲目: 楽曲名を入力してください。` };
    }
    if (!artistNames) {
      return { ok: false, error: `${i + 1}曲目: 原曲アーティスト名を入力してください。` };
    }

    let timestampSeconds: number | undefined;
    if (timestamp) {
      const parsed = parseTimestampToSeconds(timestamp);
      if (parsed == null) {
        return { ok: false, error: `${i + 1}曲目: タイムスタンプの形式が正しくありません（例: 1:23:45）。` };
      }
      timestampSeconds = parsed;
    }

    // 行に歌唱者が選ばれていなければ共通の活動者を使う。
    const effectivePerformerIds = rowPerformerIds.length > 0 ? rowPerformerIds : options.commonPerformerIds;
    if (effectivePerformerIds.length === 0 && !options.hasCommonPerformers) {
      return {
        ok: false,
        error: `${i + 1}曲目: 歌唱者を選んでください。共通の活動者を選ぶか、曲ごとに歌唱者を選んでください。`
      };
    }

    rows.push({
      songTitle,
      artistNames,
      timestampSeconds,
      performerIds: effectivePerformerIds,
      performerNames: ""
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "登録する曲を1曲以上入力してください。" };
  }

  if (options.maxRows != null && rows.length > options.maxRows) {
    return { ok: false, error: `1度に登録できるのは最大 ${options.maxRows} 曲までです。` };
  }

  return { ok: true, rows };
}
