import { NextResponse } from "next/server";

import { getSongs } from "@/lib/data/songs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const songs = await getSongs(searchParams.get("q") ?? undefined);
  return NextResponse.json({ songs });
}
