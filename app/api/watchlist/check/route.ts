import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { checkWatchlistItems } from "@/lib/data/watchlist";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { watchlistCheckSchema } from "@/lib/validations/watchlist";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = await checkRouteRateLimit(request, "api:watchlist:check", rateLimitPresets.watchlistCheck);

    if (limited) {
      return limited;
    }

    const parsed = watchlistCheckSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const results = await checkWatchlistItems(
      parsed.data.items.map((item) => ({
        id: item.id,
        songName: item.songName,
        artistName: item.artistName ?? null,
        songId: item.songId ?? null,
        addedAt: item.addedAt,
        lastCheckedAt: item.lastCheckedAt ?? null
      }))
    );

    return NextResponse.json({ results });
  } catch (error) {
    return serverError(error, {
      type: "watchlist_check_error",
      path: "/api/watchlist/check"
    });
  }
}
