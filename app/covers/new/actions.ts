"use server";

import { redirect } from "next/navigation";

import { createCover } from "@/lib/data/covers";
import { checkServerActionRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { coverCreateSchema } from "@/lib/validations/cover";

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
