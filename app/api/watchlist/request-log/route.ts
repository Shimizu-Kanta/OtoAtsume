import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { recordSongRequest } from "@/lib/data/song-request-log";
import { checkRouteRateLimit, clientIdentityHash, rateLimitPresets } from "@/lib/rate-limit/http";
import { songRequestLogSchema } from "@/lib/validations/watchlist";

export const dynamic = "force-dynamic";

// 「気になる曲」への追加時に、需要ランキング(/requests)用のログを1件記録する。
// 照合API(/api/watchlist/check)では記録しない。ウォッチリストに曲を残している限り
// 毎回の照合で加算されてしまい、1人の関心が日数分カウントされるのを避けるため。
export async function POST(request: Request) {
  try {
    const limited = await checkRouteRateLimit(
      request,
      "api:watchlist:request-log",
      rateLimitPresets.songRequestLog
    );

    if (limited) {
      return limited;
    }

    const parsed = songRequestLogSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await recordSongRequest({
      songName: parsed.data.songName,
      artistName: parsed.data.artistName ?? null,
      songId: parsed.data.songId ?? null,
      ipHash: clientIdentityHash(request.headers, "watchlist-request-log")
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, {
      type: "watchlist_request_log_error",
      path: "/api/watchlist/request-log"
    });
  }
}
