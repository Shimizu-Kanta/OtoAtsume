"use server";

import { ContentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { CoverInputError, createBulkCovers, createCover } from "@/lib/data/covers";
import { multiSongCoverTypes } from "@/lib/constants";
import { parseBulkCoverRowsFromFormData } from "@/lib/covers/bulk-rows";
import type { CoverSubmitResult } from "@/lib/covers/submit-result";
import { normalizeNames } from "@/lib/utils";
import { coverCreateSchema, multiSongCoverCommonSchema } from "@/lib/validations/cover";

const CREATABLE_STATUSES = new Set<string>(["PENDING", "APPROVED"]);

function parseStatus(formData: FormData): ContentStatus {
  const value = String(formData.get("status") ?? "");
  return (CREATABLE_STATUSES.has(value) ? value : "APPROVED") as ContentStatus;
}

// 管理画面の歌唱記録登録。公開フォーム（/covers/new の createCoverAction）と同じ
// フィールド名・単曲/複数曲の分岐ロジックを使う（CoverRegistrationForm 参照）。
// CAPTCHA・レート制限は行わず、ステータス（公開/確認待ち）を明示指定できる点のみ異なる。
export async function createAdminCoverAction(formData: FormData): Promise<CoverSubmitResult> {
  await requireAdminPage();

  const status = parseStatus(formData);
  const coverType = String(formData.get("coverType") ?? "");

  if (multiSongCoverTypes.has(coverType)) {
    return createAdminMultiSongCover(formData, coverType, status);
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
    cover = await createCover(parsed.data, status);
  } catch (error) {
    console.error("createAdminCoverAction create failed", error);
    const message = error instanceof CoverInputError ? error.message : "登録に失敗しました。";
    return { ok: false, error: message };
  }

  revalidatePath("/covers");
  revalidatePath("/admin/covers");
  revalidatePath("/admin/cover-candidates");

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
async function createAdminMultiSongCover(
  formData: FormData,
  coverType: string,
  status: ContentStatus
): Promise<CoverSubmitResult> {
  const common = multiSongCoverCommonSchema.safeParse({
    sourceUrl: formData.get("sourceUrl"),
    sourceTitle: formData.get("sourceTitle"),
    sourceImageUrl: formData.get("sourceImageUrl"),
    performedAt: formData.get("performedAt")
  });

  if (!common.success) {
    return { ok: false, error: common.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }

  const commonPerformerIds = formData.getAll("performerIds").map(String).filter(Boolean);
  const commonPerformerNames = String(formData.get("performerNames") ?? "").trim();

  if (commonPerformerNames.length > 500) {
    return { ok: false, error: "活動者名は500文字以内で入力してください。" };
  }

  const hasCommonPerformers =
    commonPerformerIds.length > 0 || normalizeNames(commonPerformerNames).length > 0;

  const parsedRows = parseBulkCoverRowsFromFormData(formData, {
    commonPerformerIds,
    hasCommonPerformers
  });

  if (!parsedRows.ok) {
    return { ok: false, error: parsedRows.error };
  }

  let created;
  try {
    created = await createBulkCovers({
      sourceUrl: common.data.sourceUrl,
      sourceTitle: common.data.sourceTitle,
      sourceImageUrl: common.data.sourceImageUrl,
      performedAt: common.data.performedAt,
      coverType,
      commonPerformerIds,
      commonPerformerNames,
      rows: parsedRows.rows,
      status
    });
  } catch (error) {
    console.error("createAdminCoverAction bulk create failed", error);
    const message = error instanceof CoverInputError ? error.message : "一括登録に失敗しました。";
    return { ok: false, error: message };
  }

  revalidatePath("/covers");
  revalidatePath("/admin/covers");
  revalidatePath("/admin/cover-candidates");

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
