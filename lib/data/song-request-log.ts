import { ContentStatus } from "@prisma/client";

import { db } from "@/lib/db";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const RANKING_WINDOW_DAYS = 7;

export function normalizeRequestQuery(songName: string, artistName: string | null) {
  const song = songName.trim().toLowerCase();
  const artist = artistName?.trim().toLowerCase() || "";

  return artist ? `${song}::${artist}` : song;
}

// 「気になる曲」への追加を匿名で記録する。登録済み・未登録を問わず記録し、
// /requests の需要ランキングの集計元になる。
// 同一IP+同一楽曲の24時間以内の重複記録は、ランキングの人気偽装対策としてスキップする
// （登録済み楽曲は songId、未登録曲は normalizedQuery で同一性を判定する）。
export async function recordSongRequest(input: {
  songName: string;
  artistName: string | null;
  songId: string | null;
  ipHash: string;
}) {
  const normalizedQuery = normalizeRequestQuery(input.songName, input.artistName);
  const since = new Date(Date.now() - DEDUP_WINDOW_MS);

  const existing = await db.songRequestLog.findFirst({
    where: {
      ipHash: input.ipHash,
      createdAt: { gte: since },
      ...(input.songId ? { songId: input.songId } : { songId: null, normalizedQuery })
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
      songId: input.songId,
      ipHash: input.ipHash
    }
  });
}

export type SongRequestRankingItem = {
  key: string;
  songId: string | null;
  songName: string;
  artistName: string | null;
  requestCount: number;
  coverCount: number | null;
};

export type SongRequestFilter = "all" | "unregistered";

// 直近7日間で「気になる曲」に追加された回数が多い順。物理削除は行わず、
// 集計時の期間絞り込みだけで「1週間で消える」を実現する。
// 登録済み楽曲は songId、未登録曲は normalizedQuery でグルーピングする
// （登録済みは表記ゆれの影響を受けずに集計できる）。
export async function getSongRequestRanking(
  filter: SongRequestFilter = "all",
  limit = 20
): Promise<SongRequestRankingItem[]> {
  const since = new Date(Date.now() - RANKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const logs = await db.songRequestLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(filter === "unregistered" ? { songId: null } : {})
    },
    orderBy: { createdAt: "desc" },
    select: { songId: true, normalizedQuery: true, songName: true, artistName: true }
  });

  // レコード数が少ないためメモリ集計で十分（groupBy では songId と normalizedQuery の
  // 二段構えのキー付けができないため、ここでまとめて処理する）。
  const grouped = new Map<string, SongRequestRankingItem>();

  for (const log of logs) {
    const key = log.songId ? `song:${log.songId}` : `query:${log.normalizedQuery}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.requestCount += 1;
      continue;
    }

    // findMany は createdAt の降順のため、最初に現れたものが最新の表記になる。
    grouped.set(key, {
      key,
      songId: log.songId,
      songName: log.songName,
      artistName: log.artistName,
      requestCount: 1,
      coverCount: null
    });
  }

  const ranking = Array.from(grouped.values())
    .sort((a, b) => b.requestCount - a.requestCount || a.songName.localeCompare(b.songName, "ja"))
    .slice(0, limit);

  await attachCoverCounts(ranking);

  return ranking;
}

// 登録済み楽曲について、現在の公開済み歌唱記録件数を埋める。
async function attachCoverCounts(ranking: SongRequestRankingItem[]) {
  const songIds = ranking
    .map((item) => item.songId)
    .filter((songId): songId is string => songId !== null);

  if (songIds.length === 0) {
    return;
  }

  const grouped = await db.cover.groupBy({
    by: ["songId"],
    where: { songId: { in: songIds }, status: ContentStatus.APPROVED },
    _count: { _all: true }
  });
  const countBySongId = new Map(grouped.map((row) => [row.songId, row._count._all]));

  // 楽曲が削除済みの場合に備え、存在確認も兼ねてタイトルを引き直す。
  const songs = await db.song.findMany({
    where: { id: { in: songIds } },
    select: { id: true, title: true, artists: { select: { artist: { select: { name: true } } } } }
  });
  const songById = new Map(songs.map((song) => [song.id, song]));

  for (const item of ranking) {
    if (!item.songId) {
      continue;
    }

    const song = songById.get(item.songId);

    if (!song) {
      // 楽曲が削除されている場合は未登録扱いに寄せる。
      item.songId = null;
      continue;
    }

    item.songName = song.title;
    item.artistName = song.artists.map(({ artist }) => artist.name).join(", ") || null;
    item.coverCount = countBySongId.get(item.songId) ?? 0;
  }
}
