import { db } from "@/lib/db";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const RANKING_WINDOW_DAYS = 7;

export function normalizeRequestQuery(songName: string, artistName: string | null) {
  const song = songName.trim().toLowerCase();
  const artist = artistName?.trim().toLowerCase() || "";

  return artist ? `${song}::${artist}` : song;
}

// 未マッチの検索を匿名でログに残す。同一IP+同一クエリの24時間以内の
// 重複記録は、ランキングの人気偽装対策としてスキップする。
export async function recordSongRequest(input: {
  songName: string;
  artistName: string | null;
  ipHash: string;
}) {
  const normalizedQuery = normalizeRequestQuery(input.songName, input.artistName);
  const since = new Date(Date.now() - DEDUP_WINDOW_MS);

  const existing = await db.songRequestLog.findFirst({
    where: {
      ipHash: input.ipHash,
      normalizedQuery,
      createdAt: { gte: since }
    },
    select: { id: true }
  });

  if (existing) {
    return;
  }

  await db.songRequestLog.create({
    data: {
      normalizedQuery,
      songName: input.songName.slice(0, 200),
      artistName: input.artistName?.slice(0, 200) || null,
      ipHash: input.ipHash
    }
  });
}

export type SongRequestRanking = {
  normalizedQuery: string;
  songName: string;
  artistName: string | null;
  count: number;
};

// 直近7日間で探された回数が多い順。物理削除は行わず、集計時の期間絞り込みだけで
// 「1週間で消える」を実現する。
export async function getRecentSongRequestRanking(limit = 20): Promise<SongRequestRanking[]> {
  const since = new Date(Date.now() - RANKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const grouped = await db.songRequestLog.groupBy({
    by: ["normalizedQuery"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { normalizedQuery: "desc" } },
    take: limit
  });

  if (grouped.length === 0) {
    return [];
  }

  // 表示用の songName/artistName は、各 normalizedQuery の最新ログから拾う
  // （表記ゆれで同じ normalizedQuery に複数の表記が混ざることは MVP では許容する）。
  const latestByQuery = await db.songRequestLog.findMany({
    where: {
      normalizedQuery: { in: grouped.map((row) => row.normalizedQuery) },
      createdAt: { gte: since }
    },
    orderBy: { createdAt: "desc" },
    select: { normalizedQuery: true, songName: true, artistName: true }
  });
  const displayByQuery = new Map<string, { songName: string; artistName: string | null }>();
  for (const row of latestByQuery) {
    if (!displayByQuery.has(row.normalizedQuery)) {
      displayByQuery.set(row.normalizedQuery, { songName: row.songName, artistName: row.artistName });
    }
  }

  return grouped.map((row) => ({
    normalizedQuery: row.normalizedQuery,
    songName: displayByQuery.get(row.normalizedQuery)?.songName ?? row.normalizedQuery,
    artistName: displayByQuery.get(row.normalizedQuery)?.artistName ?? null,
    count: row._count._all
  }));
}
