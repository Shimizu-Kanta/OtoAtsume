"use server";

import { CoverCandidateStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { getCoverCandidate, markCoverCandidateAdopted, setCoverCandidateStatus } from "@/lib/data/cover-candidates";
import { createCover } from "@/lib/data/covers";
import { runCoverCandidateCrawl, type CrawlMode, type CrawlResult } from "@/lib/crawl/cover-candidates";
import { coverCreateSchema } from "@/lib/validations/cover";

function revalidateCandidatePages() {
  revalidatePath("/admin/cover-candidates");
}

export async function rejectCoverCandidateAction(id: string, _formData?: FormData) {
  await requireAdminPage();
  await setCoverCandidateStatus(id, CoverCandidateStatus.REJECTED);
  revalidateCandidatePages();
  redirect("/admin/cover-candidates?rejected=1");
}

export async function restoreCoverCandidateAction(id: string, _formData?: FormData) {
  await requireAdminPage();
  await setCoverCandidateStatus(id, CoverCandidateStatus.PENDING);
  revalidateCandidatePages();
  redirect("/admin/cover-candidates?status=REJECTED&restored=1");
}

// COVER_VIDEO の候補を確定してカバー記録（APPROVED）を作成する。
export async function adoptCoverVideoCandidateAction(candidateId: string, formData: FormData) {
  await requireAdminPage();

  const candidate = await getCoverCandidate(candidateId);
  if (!candidate) {
    redirect(`/admin/cover-candidates?error=${encodeURIComponent("候補が見つかりません。")}`);
  }

  if (candidate.status !== CoverCandidateStatus.PENDING) {
    redirect(`/admin/cover-candidates?error=${encodeURIComponent("この候補は既に処理済みです。")}`);
  }

  const parsed = coverCreateSchema.safeParse({
    performerIds: formData.getAll("performerIds").map(String).filter(Boolean),
    performerNames: formData.get("performerNames"),
    songTitle: formData.get("songTitle"),
    artistNames: formData.get("artistNames"),
    performedAt: formData.get("performedAt"),
    coverType: formData.get("coverType"),
    sourceUrl: candidate.videoUrl,
    sourceTitle: formData.get("sourceTitle"),
    sourceImageUrl: candidate.thumbnailUrl ?? undefined,
    timestampSeconds: formData.get("timestampSeconds")
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "入力内容を確認してください。";
    redirect(`/admin/cover-candidates/${candidateId}?error=${encodeURIComponent(message)}`);
  }

  const cover = await createCover(parsed.data);
  await markCoverCandidateAdopted(candidateId, cover.id);

  revalidateCandidatePages();
  revalidatePath("/covers");
  revalidatePath("/songs");
  redirect("/admin/cover-candidates?adopted=1");
}

function normalizeMode(value: unknown): CrawlMode {
  return value === "KARAOKE_STREAM" ? "KARAOKE_STREAM" : "COVER_VIDEO";
}

export async function runFullCrawlAction(mode: CrawlMode): Promise<CrawlResult> {
  await requireAdminPage();
  const result = await runCoverCandidateCrawl({ mode: normalizeMode(mode) });
  revalidateCandidatePages();
  return result;
}

export async function runScopedCrawlAction(mode: CrawlMode, formData: FormData): Promise<CrawlResult> {
  await requireAdminPage();

  const performerIds = formData.getAll("performerIds").map(String).filter(Boolean);
  const publishedAfterRaw = formData.get("publishedAfter");
  const publishedAfter =
    typeof publishedAfterRaw === "string" && publishedAfterRaw
      ? new Date(`${publishedAfterRaw}T00:00:00.000Z`)
      : undefined;

  const result = await runCoverCandidateCrawl({
    mode: normalizeMode(mode),
    performerIds: performerIds.length > 0 ? performerIds : undefined,
    publishedAfter: publishedAfter && !Number.isNaN(publishedAfter.getTime()) ? publishedAfter : undefined
  });

  revalidateCandidatePages();
  return result;
}
