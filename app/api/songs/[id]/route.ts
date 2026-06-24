import { NextResponse } from "next/server";

import { getSongById } from "@/lib/data/songs";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const song = await getSongById(id);

  if (!song) {
    return NextResponse.json({ error: "楽曲が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ song });
}
