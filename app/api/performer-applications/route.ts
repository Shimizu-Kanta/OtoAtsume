import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { createPerformerApplication } from "@/lib/data/applications";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { captchaTokenFromBody, verifyCaptchaToken } from "@/lib/security/captcha";
import { performerApplicationCreateSchema } from "@/lib/validations/performer-application";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = await checkRouteRateLimit(
      request,
      "api:performer-applications:create",
      rateLimitPresets.performerApplicationCreate
    );

    if (limited) {
      return limited;
    }

    const body = await readJson(request);
    const captcha = await verifyCaptchaToken(captchaTokenFromBody(body));

    if (!captcha.ok) {
      return NextResponse.json(
        { error: captcha.message ?? "CAPTCHA認証に失敗しました。" },
        { status: 400 }
      );
    }

    const parsed = performerApplicationCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const application = await createPerformerApplication(parsed.data);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
