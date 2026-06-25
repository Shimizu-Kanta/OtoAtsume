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
  const rateLimit = await checkServerActionRateLimit(
    "action:covers:create",
    rateLimitPresets.coverCreate
  );

  if (!rateLimit.allowed) {
    errorRedirect("短時間に登録が多すぎます。少し待ってから再試行してください。");
  }

  const captcha = await verifyCaptchaToken(String(formData.get("captchaToken") ?? ""));

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
    timestampSeconds: formData.get("timestampSeconds")
  });

  if (!parsed.success) {
    errorRedirect(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  }

  const cover = await createCover(parsed.data);
  redirect(`/covers/${cover.id}?created=1`);
}
