import { NextResponse } from "next/server";

import { checkRouteRateLimit } from "@/lib/rate-limit/http";
import { findSimilarSongs, suggestSongs } from "@/lib/data/songs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await checkRouteRateLimit(request, "api:songs:suggest", {
    limit: 120,
    windowMs: 60 * 1000
  });
  if (limited) {
    return limited;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const wantSimilar = searchParams.get("similar") === "1";

  if (query.trim().length === 0) {
    return NextResponse.json({ suggestions: [], similar: [] });
  }

  const [suggestions, similar] = await Promise.all([
    suggestSongs(query),
    // 新規作成の警告用（?similar=1 のときだけ計算）
    wantSimilar ? findSimilarSongs(query) : Promise.resolve([])
  ]);

  return NextResponse.json({ suggestions, similar });
}
