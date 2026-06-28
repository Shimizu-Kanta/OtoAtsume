"use server";

import { redirect } from "next/navigation";

import { createPerformerApplication } from "@/lib/data/applications";
import { checkServerActionRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { performerApplicationCreateSchema } from "@/lib/validations/performer-application";

function errorRedirect(message: string): never {
  redirect(`/performer-applications/new?error=${encodeURIComponent(message)}`);
}

export async function createPerformerApplicationAction(formData: FormData) {
  let rateLimit;
  try {
    rateLimit = await checkServerActionRateLimit(
      "action:performer-applications:create",
      rateLimitPresets.performerApplicationCreate
    );
  } catch (error) {
    console.error("createPerformerApplicationAction rate limit failed", error);
    errorRedirect("申請の送信に失敗しました。時間をおいて再試行してください。");
  }

  if (!rateLimit.allowed) {
    errorRedirect("短時間に申請が多すぎます。少し待ってから再試行してください。");
  }

  let captcha;
  try {
    captcha = await verifyCaptchaToken(String(formData.get("captchaToken") ?? ""));
  } catch (error) {
    console.error("createPerformerApplicationAction captcha failed", error);
    errorRedirect("申請の送信に失敗しました。時間をおいて再試行してください。");
  }

  if (!captcha.ok) {
    errorRedirect(captcha.message ?? "CAPTCHA認証に失敗しました。");
  }

  const parsed = performerApplicationCreateSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    groupId: formData.get("groupId"),
    memo: formData.get("memo")
  });

  if (!parsed.success) {
    errorRedirect(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  }

  try {
    await createPerformerApplication(parsed.data);
  } catch (error) {
    console.error("createPerformerApplicationAction create failed", error);
    const message = error instanceof Error ? error.message : "申請の送信に失敗しました。時間をおいて再試行してください。";
    errorRedirect(message);
  }

  redirect("/?application=1");
}
