import { NextResponse } from "next/server";

import { getCoverById } from "@/lib/data/covers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const cover = await getCoverById(id);

  if (!cover) {
    return NextResponse.json({ error: "カバー記録が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ cover });
}
