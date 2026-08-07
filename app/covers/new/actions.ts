"use server";

import { revalidatePath } from "next/cache";

import { createBulkCovers, createCover } from "@/lib/data/covers";
import { multiSongCoverTypes } from "@/lib/constants";
import { parseBulkCoverRowsFromFormData } from "@/lib/covers/bulk-rows";
import type { CoverSubmitResult } from "@/lib/covers/submit-result";
import { checkServerActionRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { normalizeNames } from "@/lib/utils";
import { coverCreateSchema } from "@/lib/validations/cover";

export async function createCoverAction(formData: FormData): Promise<CoverSubmitResult> {
  let rateLimit;
  try {
    rateLimit = await checkServerActionRateLimit(
      "action:covers:create",
      rateLimitPresets.coverCreate
    );
  } catch (error) {
    console.error("createCoverAction rate limit failed", error);
    return { ok: false, error: "登録に失敗しました。時間をおいて再試行してください。" };
  }

  if (!rateLimit.allowed) {
    return { ok: false, error: "短時間に登録が多すぎます。少し待ってから再試行してください。" };
  }

  let captcha;
  try {
    captcha = await verifyCaptchaToken(String(formData.get("captchaToken") ?? ""));
  } catch (error) {
    console.error("createCoverAction captcha failed", error);
    return { ok: false, error: "登録に失敗しました。時間をおいて再試行してください。" };
  }

  if (!captcha.ok) {
    return { ok: false, error: captcha.message ?? "CAPTCHA認証に失敗しました。" };
  }

  const coverType = String(formData.get("coverType") ?? "");

  if (multiSongCoverTypes.has(coverType)) {
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }

  let cover;
  try {
    cover = await createCover(parsed.data);
  } catch (error) {
    console.error("createCoverAction create failed", error);
    return { ok: false, error: "登録に失敗しました。時間をおいて再試行してください。" };
  }

  revalidatePath("/covers");

  return {
    ok: true,
    coverIds: [cover.id],
    sourceUrl: cover.sourceUrl,
    preview: [
      {
        id: cover.id,
        songTitle: cover.song.title,
        timestampSeconds: cover.timestampSeconds,
        performerNames: cover.performers.map(({ performer }) => performer.name)
      }
    ]
  };
}

// 歌枠・ライブ・メドレー：1つのURLから複数曲をまとめて登録する。
async function createMultiSongCover(formData: FormData, coverType: string): Promise<CoverSubmitResult> {
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const sourceTitle = String(formData.get("sourceTitle") ?? "").trim();
  const sourceImageUrl = String(formData.get("sourceImageUrl") ?? "").trim();
  const performedAt = String(formData.get("performedAt") ?? "").trim();
  const commonPerformerIds = formData.getAll("performerIds").map(String).filter(Boolean);
  const commonPerformerNames = String(formData.get("performerNames") ?? "").trim();

  if (!sourceUrl) {
    return { ok: false, error: "情報元URLを入力してください。" };
  }

  try {
    // URL として妥当か（単曲側の zod と同等の最低限のチェック）。
    new URL(sourceUrl);
  } catch {
    return { ok: false, error: "情報元URLの形式が正しくありません。" };
  }

  if (!performedAt) {
    return { ok: false, error: "歌唱日を入力してください。" };
  }

  const performedAtDate = new Date(`${performedAt}T00:00:00.000Z`);
  if (Number.isNaN(performedAtDate.getTime())) {
    return { ok: false, error: "歌唱日の形式が正しくありません。" };
  }

  const hasCommonPerformers =
    commonPerformerIds.length > 0 || normalizeNames(commonPerformerNames).length > 0;

  const parsedRows = parseBulkCoverRowsFromFormData(formData, {
    commonPerformerIds,
    hasCommonPerformers,
    maxRows: 20
  });

  if (!parsedRows.ok) {
    return { ok: false, error: parsedRows.error };
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
      rows: parsedRows.rows
    });
  } catch (error) {
    console.error("createCoverAction bulk create failed", error);
    const message = error instanceof Error ? error.message : "登録に失敗しました。時間をおいて再試行してください。";
    return { ok: false, error: message };
  }

  revalidatePath("/covers");

  return {
    ok: true,
    coverIds: created.map((cover) => cover.id),
    sourceUrl: created[0]?.sourceUrl ?? null,
    preview: created.map((cover) => ({
      id: cover.id,
      songTitle: cover.song.title,
      timestampSeconds: cover.timestampSeconds,
      performerNames: cover.performers.map(({ performer }) => performer.name)
    }))
  };
}
