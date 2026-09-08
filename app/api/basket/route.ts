import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { resolveBasketItems } from "@/lib/data/basket";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { basketResolveSchema } from "@/lib/validations/basket";

export const dynamic = "force-dynamic";

// かごは coverId しか持たないため、描画のたびにここで表示・再生用の情報へ解決する。
export async function POST(request: Request) {
  try {
    const limited = await checkRouteRateLimit(request, "api:basket:resolve", rateLimitPresets.basketResolve);

    if (limited) {
      return limited;
    }

    const parsed = basketResolveSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const items = await resolveBasketItems(parsed.data.ids);

    return NextResponse.json({ items });
  } catch (error) {
    return serverError(error, { type: "basket_resolve_error", path: "/api/basket" });
  }
}
