import { ContentStatus, MasterDataStatus } from "@prisma/client";

import { db } from "@/lib/db";

const APPROVED = ContentStatus.APPROVED;

async function topSongsByCoverCount(limit: number) {
  const grouped = await db.cover.groupBy({
    by: ["songId"],
    where: { status: APPROVED },
    _count: { songId: true },
    orderBy: { _count: { songId: "desc" } },
    take: limit
  });

  const songs = await db.song.findMany({
    where: { id: { in: grouped.map((row) => row.songId) } },
    select: { id: true, title: true, artists: { select: { artist: { select: { name: true } } } } }
  });
  const songById = new Map(songs.map((song) => [song.id, song]));

  return grouped
    .map((row) => {
      const song = songById.get(row.songId);
      if (!song) {
        return null;
      }
      return {
        id: song.id,
        title: song.title,
        artistNames: song.artists.map(({ artist }) => artist.name).join(", "),
        count: row._count.songId
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

async function topPerformersByCoverCount(limit: number) {
  const grouped = await db.coverPerformer.groupBy({
    by: ["performerId"],
    where: { cover: { status: APPROVED }, performer: { status: MasterDataStatus.APPROVED } },
    _count: { performerId: true },
    orderBy: { _count: { performerId: "desc" } },
    take: limit
  });

  const performers = await db.performer.findMany({
    where: { id: { in: grouped.map((row) => row.performerId) } },
    select: { id: true, name: true, group: { select: { name: true } } }
  });
  const performerById = new Map(performers.map((performer) => [performer.id, performer]));

  return grouped
    .map((row) => {
      const performer = performerById.get(row.performerId);
      if (!performer) {
        return null;
      }
      return {
        id: performer.id,
        name: performer.name,
        groupName: performer.group?.name ?? null,
        count: row._count.performerId
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

async function topArtistsByCoverCount(limit: number) {
  // 歌唱記録は128件程度のためメモリ集計で十分。1曲が複数アーティストを持つ場合は各々に加算する。
  const covers = await db.cover.findMany({
    where: { status: APPROVED },
    select: {
      song: { select: { artists: { select: { artist: { select: { id: true, name: true } } } } } }
    }
  });

  const counts = new Map<string, { name: string; count: number }>();
  for (const cover of covers) {
    for (const { artist } of cover.song.artists) {
      const existing = counts.get(artist.id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(artist.id, { name: artist.name, count: 1 });
      }
    }
  }

  return Array.from(counts.entries())
    .map(([id, value]) => ({ id, name: value.name, count: value.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"))
    .slice(0, limit);
}

async function trendingSongs(limit: number, sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const grouped = await db.cover.groupBy({
    by: ["songId"],
    where: { status: APPROVED, createdAt: { gte: since } },
    _count: { songId: true },
    orderBy: { _count: { songId: "desc" } },
    take: limit
  });

  const songs = await db.song.findMany({
    where: { id: { in: grouped.map((row) => row.songId) } },
    select: { id: true, title: true, artists: { select: { artist: { select: { name: true } } } } }
  });
  const songById = new Map(songs.map((song) => [song.id, song]));

  return grouped
    .map((row) => {
      const song = songById.get(row.songId);
      if (!song) {
        return null;
      }
      return {
        id: song.id,
        title: song.title,
        artistNames: song.artists.map(({ artist }) => artist.name).join(", "),
        count: row._count.songId
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function getRankings() {
  const [topSongs, topPerformers, topArtists, trending] = await Promise.all([
    topSongsByCoverCount(20),
    topPerformersByCoverCount(20),
    topArtistsByCoverCount(20),
    trendingSongs(10, 30)
  ]);

  return { topSongs, topPerformers, topArtists, trending };
}
