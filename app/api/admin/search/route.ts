import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { listAdminPerformers, listAdminSongs } from "@/lib/data/admin";
import { searchFeaturesForAdmin } from "@/lib/data/features";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 50;
const RESULT_LIMIT = 5;

// 管理画面の ⌘K 検索。活動者(別名を含む)・楽曲・特集を 5 件ずつ返す。
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  if (query.length < 1) {
    return NextResponse.json({ performers: [], songs: [], features: [] });
  }

  const [performers, songs, features] = await Promise.all([
    listAdminPerformers({ query }, 1, RESULT_LIMIT),
    listAdminSongs({ query }, 1, RESULT_LIMIT),
    searchFeaturesForAdmin(query, RESULT_LIMIT)
  ]);

  return NextResponse.json({
    performers: performers.items.map((performer) => ({
      id: performer.id,
      name: performer.name,
      sub: performer.group?.name ?? ""
    })),
    songs: songs.items.map((song) => ({
      id: song.id,
      title: song.title,
      sub: song.artists.map(({ artist }) => artist.name).join(", ")
    })),
    features: features.map((feature) => ({ id: feature.id, title: feature.title }))
  });
}
