import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { getAdminCovers } from "@/lib/data/covers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const covers = await getAdminCovers({
    performer: searchParams.get("performer") ?? undefined,
    song: searchParams.get("song") ?? undefined,
    artist: searchParams.get("artist") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    coverType: searchParams.get("coverType") ?? undefined
  });

  return NextResponse.json({ covers });
}
