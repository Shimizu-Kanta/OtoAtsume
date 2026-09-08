import { NextResponse } from "next/server";

import { serverError, validationError } from "@/lib/api/response";
import { listCoverIdsBySourceVideoId } from "@/lib/data/basket";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { basketExpandSchema } from "@/lib/validations/basket";

export const dynamic = "force-dynamic";

// アルバム（複数曲入りの一枚）をかごに入れるとき、収録曲すべての ID を取りに来る。
// トップページの棚のカードは代表1曲しか持っていないため、ここで全曲に展開する。
export async function GET(request: Request) {
  try {
    const limited = await checkRouteRateLimit(request, "api:basket:expand", rateLimitPresets.basketExpand);

    if (limited) {
      return limited;
    }

    const { searchParams } = new URL(request.url);
    const parsed = basketExpandSchema.safeParse({ videoId: searchParams.get("videoId") ?? "" });

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const ids = await listCoverIdsBySourceVideoId(parsed.data.videoId);

    return NextResponse.json({ ids });
  } catch (error) {
    return serverError(error, { type: "basket_expand_error", path: "/api/basket/expand" });
  }
}
