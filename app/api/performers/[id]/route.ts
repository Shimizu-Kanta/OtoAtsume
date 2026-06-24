import { NextResponse } from "next/server";

import { getPerformerById } from "@/lib/data/performers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const performer = await getPerformerById(id);

  if (!performer) {
    return NextResponse.json({ error: "活動者が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ performer });
}
