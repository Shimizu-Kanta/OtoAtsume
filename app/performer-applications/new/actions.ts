"use server";

import { redirect } from "next/navigation";

import { createPerformerApplication } from "@/lib/data/applications";
import { checkServerActionRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { performerApplicationCreateSchema } from "@/lib/validations/performer-application";

export async function createPerformerApplicationAction(formData: FormData) {
  const rateLimit = await checkServerActionRateLimit(
    "action:performer-applications:create",
    rateLimitPresets.performerApplicationCreate
  );

  if (!rateLimit.allowed) {
    redirect(
      `/performer-applications/new?error=${encodeURIComponent(
        "短時間に申請が多すぎます。少し待ってから再試行してください。"
      )}`
    );
  }

  const captcha = await verifyCaptchaToken(String(formData.get("captchaToken") ?? ""));

  if (!captcha.ok) {
    redirect(
      `/performer-applications/new?error=${encodeURIComponent(
        captcha.message ?? "CAPTCHA認証に失敗しました。"
      )}`
    );
  }

  const parsed = performerApplicationCreateSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    groupId: formData.get("groupId"),
    memo: formData.get("memo")
  });

  if (!parsed.success) {
    redirect(
      `/performer-applications/new?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。"
      )}`
    );
  }

  await createPerformerApplication(parsed.data);
  redirect("/?application=1");
}
