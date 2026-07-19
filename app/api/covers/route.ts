import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { createCover, getApprovedCovers } from "@/lib/data/covers";
import { parsePageParam } from "@/lib/utils";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { captchaTokenFromBody, verifyCaptchaToken } from "@/lib/security/captcha";
import { coverCreateSchema } from "@/lib/validations/cover";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parsePageParam(searchParams.get("page") ?? undefined);
  const tagIds = Array.from(
    new Set(
      searchParams
        .getAll("tags")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
  const { items: covers, totalCount, totalPages } = await getApprovedCovers(
    {
      performer: searchParams.get("performer") ?? undefined,
      song: searchParams.get("song") ?? undefined,
      artist: searchParams.get("artist") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      coverType: searchParams.get("coverType") ?? undefined,
      tagIds
    },
    page
  );

  return NextResponse.json({ covers, totalCount, page, totalPages });
}

export async function POST(request: Request) {
  try {
    const limited = await checkRouteRateLimit(request, "api:covers:create", rateLimitPresets.coverCreate);

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

    const parsed = coverCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const cover = await createCover(parsed.data);
    return NextResponse.json({ cover }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
