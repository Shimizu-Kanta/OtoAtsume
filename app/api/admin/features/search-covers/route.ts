import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { searchApprovedCoversForPicker } from "@/lib/data/features";

export const dynamic = "force-dynamic";

// 特集の曲選択UI用。承認済み歌唱記録を楽曲名・活動者名・原曲アーティスト名で検索する。
// 管理画面からのみ使うため requireAdminApi を通す。
export async function GET(request: Request) {
  const auth = await requireAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (query.trim().length === 0) {
    return NextResponse.json({ covers: [] });
  }

  const covers = await searchApprovedCoversForPicker(query);
  return NextResponse.json({ covers });
}
