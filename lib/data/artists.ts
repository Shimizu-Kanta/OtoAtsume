import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type ArtistSuggestion = { id: string; name: string };

// アーティスト名サジェスト。contains 検索を優先し、不足分は pg_trgm 類似検索で補う。
export async function suggestArtists(query: string, limit = 8): Promise<ArtistSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const contains = await db.artist.findMany({
    where: { name: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: limit
  });

  const byId = new Map(contains.map((artist) => [artist.id, artist]));

  if (contains.length < limit) {
    const similar = await findSimilarArtists(trimmed, 0.2);
    for (const artist of similar) {
      if (!byId.has(artist.id)) {
        byId.set(artist.id, artist);
      }
      if (byId.size >= limit) {
        break;
      }
    }
  }

  return Array.from(byId.values()).slice(0, limit);
}

// 表記ゆれ抑止の警告用。類似度が閾値以上の既存アーティストを返す。
export async function findSimilarArtists(query: string, threshold = 0.6): Promise<ArtistSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const rows = await db.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id, name
      FROM "artists"
      WHERE similarity(name, ${trimmed}) >= ${threshold}
      ORDER BY similarity(name, ${trimmed}) DESC
      LIMIT 5
    `;
    return rows;
  } catch (error) {
    console.error("Artist similarity warning failed", error);
    return [];
  }
}
