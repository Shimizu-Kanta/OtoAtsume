import { NextResponse } from "next/server";

import { findSimilarArtists, suggestArtists } from "@/lib/data/artists";
import { checkRouteRateLimit } from "@/lib/rate-limit/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await checkRouteRateLimit(request, "api:artists:suggest", {
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
    suggestArtists(query),
    wantSimilar ? findSimilarArtists(query) : Promise.resolve([])
  ]);

  return NextResponse.json({ suggestions, similar });
}
