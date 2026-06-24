import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { createCover, getApprovedCovers } from "@/lib/data/covers";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { coverCreateSchema } from "@/lib/validations/cover";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const covers = await getApprovedCovers({
    performer: searchParams.get("performer") ?? undefined,
    song: searchParams.get("song") ?? undefined,
    artist: searchParams.get("artist") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    coverType: searchParams.get("coverType") ?? undefined
  });

  return NextResponse.json({ covers });
}

export async function POST(request: Request) {
  try {
    const limited = checkRouteRateLimit(request, "api:covers:create", rateLimitPresets.coverCreate);

    if (limited) {
      return limited;
    }

    const body = await readJson(request);
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
