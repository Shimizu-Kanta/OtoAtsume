"use server";

import { redirect } from "next/navigation";

import { createReport } from "@/lib/data/covers";
import { checkServerActionRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { reportCreateSchema } from "@/lib/validations/report";

export async function createReportAction(coverId: string, formData: FormData) {
  const rateLimit = await checkServerActionRateLimit(
    "action:reports:create",
    rateLimitPresets.reportCreate
  );

  if (!rateLimit.allowed) {
    redirect(
      `/covers/${coverId}/report?error=${encodeURIComponent(
        "短時間に通報が多すぎます。少し待ってから再試行してください。"
      )}`
    );
  }

  const captcha = await verifyCaptchaToken(String(formData.get("captchaToken") ?? ""));

  if (!captcha.ok) {
    redirect(
      `/covers/${coverId}/report?error=${encodeURIComponent(
        captcha.message ?? "CAPTCHA認証に失敗しました。"
      )}`
    );
  }

  const parsed = reportCreateSchema.safeParse({
    reason: formData.get("reason"),
    memo: formData.get("memo")
  });

  if (!parsed.success) {
    redirect(
      `/covers/${coverId}/report?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。"
      )}`
    );
  }

  await createReport(coverId, parsed.data);
  redirect(`/covers/${coverId}?reported=1`);
}
