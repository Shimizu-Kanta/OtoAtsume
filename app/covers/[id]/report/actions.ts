"use server";

import { redirect } from "next/navigation";

import { createReport } from "@/lib/data/covers";
import { checkServerActionRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { reportCreateSchema } from "@/lib/validations/report";

function errorRedirect(coverId: string, message: string): never {
  redirect(`/covers/${coverId}/report?error=${encodeURIComponent(message)}`);
}

export async function createReportAction(coverId: string, formData: FormData) {
  let rateLimit;
  try {
    rateLimit = await checkServerActionRateLimit(
      "action:reports:create",
      rateLimitPresets.reportCreate
    );
  } catch (error) {
    console.error("createReportAction rate limit failed", error);
    errorRedirect(coverId, "送信に失敗しました。時間をおいて再試行してください。");
  }

  if (!rateLimit.allowed) {
    errorRedirect(coverId, "短時間に通報が多すぎます。少し待ってから再試行してください。");
  }

  let captcha;
  try {
    captcha = await verifyCaptchaToken(String(formData.get("captchaToken") ?? ""));
  } catch (error) {
    console.error("createReportAction captcha failed", error);
    errorRedirect(coverId, "送信に失敗しました。時間をおいて再試行してください。");
  }

  if (!captcha.ok) {
    errorRedirect(coverId, captcha.message ?? "CAPTCHA認証に失敗しました。");
  }

  const parsed = reportCreateSchema.safeParse({
    reason: formData.get("reason"),
    memo: formData.get("memo")
  });

  if (!parsed.success) {
    errorRedirect(coverId, parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  }

  try {
    await createReport(coverId, parsed.data);
  } catch (error) {
    console.error("createReportAction create failed", error);
    errorRedirect(coverId, "送信に失敗しました。時間をおいて再試行してください。");
  }

  redirect(`/covers/${coverId}?reported=1`);
}
