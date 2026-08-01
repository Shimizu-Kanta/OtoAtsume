"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createBulkCovers, createCover, type BulkCoverRow } from "@/lib/data/covers";
import { checkServerActionRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { normalizeNames, parseTimestampToSeconds } from "@/lib/utils";
import { coverCreateSchema } from "@/lib/validations/cover";

// 1つのアーカイブから複数曲をまとめて登録できる歌唱種別。
const MULTI_SONG_TYPES = new Set(["KARAOKE_STREAM", "LIVE_EVENT", "MEDLEY"]);
const MAX_BULK_ROWS = 20;

function errorRedirect(message: string): never {
  redirect(`/covers/new?error=${encodeURIComponent(message)}`);
}

export async function createCoverAction(formData: FormData) {
  let rateLimit;
  try {
    rateLimit = await checkServerActionRateLimit(
      "action:covers:create",
      rateLimitPresets.coverCreate
    );
  } catch (error) {
    console.error("createCoverAction rate limit failed", error);
    errorRedirect("登録に失敗しました。時間をおいて再試行してください。");
  }

  if (!rateLimit.allowed) {
    errorRedirect("短時間に登録が多すぎます。少し待ってから再試行してください。");
  }

  let captcha;
  try {
    captcha = await verifyCaptchaToken(String(formData.get("captchaToken") ?? ""));
  } catch (error) {
    console.error("createCoverAction captcha failed", error);
    errorRedirect("登録に失敗しました。時間をおいて再試行してください。");
  }

  if (!captcha.ok) {
    errorRedirect(captcha.message ?? "CAPTCHA認証に失敗しました。");
  }

  const coverType = String(formData.get("coverType") ?? "");

  if (MULTI_SONG_TYPES.has(coverType)) {
    return createMultiSongCover(formData, coverType);
  }

  const parsed = coverCreateSchema.safeParse({
    performerIds: formData.getAll("performerIds").map(String).filter(Boolean),
    performerNames: formData.get("performerNames"),
    songTitle: formData.get("songTitle"),
    artistNames: formData.get("artistNames"),
    performedAt: formData.get("performedAt"),
    coverType: formData.get("coverType"),
    sourceUrl: formData.get("sourceUrl"),
    sourceTitle: formData.get("sourceTitle"),
    sourceImageUrl: formData.get("sourceImageUrl"),
    timestampSeconds: formData.get("timestampSeconds")
  });

  if (!parsed.success) {
    errorRedirect(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  }

  let cover;
  try {
    cover = await createCover(parsed.data);
  } catch (error) {
    console.error("createCoverAction create failed", error);
    errorRedirect("登録に失敗しました。時間をおいて再試行してください。");
  }

  redirect(`/covers/${cover.id}?created=1`);
}

// 歌枠・ライブ・メドレー：1つのURLから複数曲をまとめて登録する。
async function createMultiSongCover(formData: FormData, coverType: string): Promise<never> {
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const sourceTitle = String(formData.get("sourceTitle") ?? "").trim();
  const sourceImageUrl = String(formData.get("sourceImageUrl") ?? "").trim();
  const performedAt = String(formData.get("performedAt") ?? "").trim();
  const commonPerformerIds = formData.getAll("performerIds").map(String).filter(Boolean);
  const commonPerformerNames = String(formData.get("performerNames") ?? "").trim();

  if (!sourceUrl) {
    errorRedirect("情報元URLを入力してください。");
  }

  let sourceUrlValid = false;
  try {
    // URL として妥当か（単曲側の zod と同等の最低限のチェック）。
    new URL(sourceUrl);
    sourceUrlValid = true;
  } catch {
    sourceUrlValid = false;
  }
  if (!sourceUrlValid) {
    errorRedirect("情報元URLの形式が正しくありません。");
  }

  if (!performedAt) {
    errorRedirect("歌唱日を入力してください。");
  }

  const performedAtDate = new Date(`${performedAt}T00:00:00.000Z`);
  if (Number.isNaN(performedAtDate.getTime())) {
    errorRedirect("歌唱日の形式が正しくありません。");
  }

  const hasCommonPerformers =
    commonPerformerIds.length > 0 || normalizeNames(commonPerformerNames).length > 0;

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

    if (!timestamp && !songTitle && !artistNames) {
      continue;
    }

    if (!songTitle) {
      errorRedirect(`${i + 1}曲目: 楽曲名を入力してください。`);
    }
    if (!artistNames) {
      errorRedirect(`${i + 1}曲目: 原曲アーティスト名を入力してください。`);
    }

    let timestampSeconds: number | undefined;
    if (timestamp) {
      const parsedTimestamp = parseTimestampToSeconds(timestamp);
      if (parsedTimestamp == null) {
        errorRedirect(`${i + 1}曲目: タイムスタンプの形式が正しくありません（例: 1:23:45）。`);
      }
      timestampSeconds = parsedTimestamp;
    }

    const effectivePerformerIds = rowPerformerIds.length > 0 ? rowPerformerIds : commonPerformerIds;
    if (effectivePerformerIds.length === 0 && !hasCommonPerformers) {
      errorRedirect(`${i + 1}曲目: 歌唱者を選んでください。共通の活動者を選ぶか、曲ごとに歌唱者を選んでください。`);
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
    errorRedirect("登録する曲を1曲以上入力してください。");
  }

  if (rows.length > MAX_BULK_ROWS) {
    errorRedirect(`1度に登録できるのは最大 ${MAX_BULK_ROWS} 曲までです。`);
  }

  let created;
  try {
    created = await createBulkCovers({
      sourceUrl,
      sourceTitle: sourceTitle || undefined,
      sourceImageUrl: sourceImageUrl || undefined,
      performedAt: performedAtDate,
      coverType,
      commonPerformerIds,
      commonPerformerNames,
      rows
    });
  } catch (error) {
    console.error("createCoverAction bulk create failed", error);
    const message = error instanceof Error ? error.message : "登録に失敗しました。時間をおいて再試行してください。";
    errorRedirect(message);
  }

  revalidatePath("/covers");

  const firstCoverId = created[0]?.id;
  if (firstCoverId) {
    redirect(`/covers/${firstCoverId}?created=1`);
  }

  redirect("/covers");
}
