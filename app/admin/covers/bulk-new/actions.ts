"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { createBulkCovers, type BulkCoverRow } from "@/lib/data/covers";
import { coverTypeOptions } from "@/lib/constants";
import { parseTimestampToSeconds } from "@/lib/utils";

export type BulkCreateResult =
  | { ok: true; count: number; firstCoverId: string | null }
  | { ok: false; error: string };

function isValidCoverType(value: string) {
  return coverTypeOptions.some((option) => option.value === value);
}

export async function createBulkCoversAction(formData: FormData): Promise<BulkCreateResult> {
  await requireAdminPage();

  const sourceUrl = (formData.get("sourceUrl") ?? "").toString().trim();
  const sourceTitle = (formData.get("sourceTitle") ?? "").toString().trim();
  const sourceImageUrl = (formData.get("sourceImageUrl") ?? "").toString().trim();
  const performedAt = (formData.get("performedAt") ?? "").toString().trim();
  const coverType = (formData.get("coverType") ?? "").toString();
  const commonPerformerIds = formData.getAll("performerIds").map(String).filter(Boolean);

  if (!sourceUrl) {
    return { ok: false, error: "情報元URLを入力してください。" };
  }
  if (!performedAt) {
    return { ok: false, error: "歌唱日を入力してください。" };
  }
  if (!isValidCoverType(coverType)) {
    return { ok: false, error: "歌唱種別を選択してください。" };
  }

  const performedAtDate = new Date(`${performedAt}T00:00:00.000Z`);
  if (Number.isNaN(performedAtDate.getTime())) {
    return { ok: false, error: "歌唱日の形式が正しくありません。" };
  }

  const timestamps = formData.getAll("rowTimestamp").map(String);
  const songTitles = formData.getAll("rowSongTitle").map(String);
  const artistNamesList = formData.getAll("rowArtistNames").map(String);
  // 曲ごとの歌唱者はチップUIからカンマ区切りのIDで届く（行と1対1で対応）。
  const performerIdsList = formData.getAll("rowPerformerIds").map(String);

  const rows: BulkCoverRow[] = [];
  const rowCount = Math.max(
    timestamps.length,
    songTitles.length,
    artistNamesList.length,
    performerIdsList.length
  );

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
    const effectivePerformerIds = rowPerformerIds.length > 0 ? rowPerformerIds : commonPerformerIds;
    if (effectivePerformerIds.length === 0) {
      return {
        ok: false,
        error: `${i + 1}曲目: 歌唱者が選ばれていません。共通の活動者を選ぶか、曲ごとに歌唱者を選んでください。`
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

  try {
    const created = await createBulkCovers({
      sourceUrl,
      sourceTitle: sourceTitle || undefined,
      sourceImageUrl: sourceImageUrl || undefined,
      performedAt: performedAtDate,
      coverType,
      commonPerformerIds,
      rows
    });

    revalidatePath("/covers");
    revalidatePath("/admin/covers");
    revalidatePath("/admin/cover-candidates");

    return { ok: true, count: created.length, firstCoverId: created[0]?.id ?? null };
  } catch (error) {
    console.error("createBulkCoversAction failed", error);
    const message = error instanceof Error ? error.message : "一括登録に失敗しました。";
    return { ok: false, error: message };
  }
}
