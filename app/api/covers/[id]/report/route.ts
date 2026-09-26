import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { CoverNotFoundError, createReport } from "@/lib/data/covers";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { captchaTokenFromBody, verifyCaptchaToken } from "@/lib/security/captcha";
import { reportCreateSchema } from "@/lib/validations/report";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await checkRouteRateLimit(request, "api:reports:create", rateLimitPresets.reportCreate);

    if (limited) {
      return limited;
    }

    const { id } = await context.params;
    const body = await readJson(request);
    const captcha = await verifyCaptchaToken(captchaTokenFromBody(body));

    if (!captcha.ok) {
      return NextResponse.json(
        { error: captcha.message ?? "CAPTCHA認証に失敗しました。" },
        { status: 400 }
      );
    }

    const parsed = reportCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const report = await createReport(id, parsed.data);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof CoverNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return serverError(error);
  }
}
