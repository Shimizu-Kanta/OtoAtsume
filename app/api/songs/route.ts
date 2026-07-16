import { NextResponse } from "next/server";

import { getSongs } from "@/lib/data/songs";
import { parsePageParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parsePageParam(searchParams.get("page") ?? undefined);
  const { items: songs, totalCount, totalPages } = await getSongs(
    { query: searchParams.get("q") ?? undefined },
    page
  );
  return NextResponse.json({ songs, totalCount, page, totalPages });
}
