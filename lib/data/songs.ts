import { ContentStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export const songListInclude = {
  artists: {
    include: { artist: true }
  },
  _count: {
    select: {
      covers: {
        where: { status: ContentStatus.APPROVED }
      }
    }
  }
} satisfies Prisma.SongInclude;

export const songDetailInclude = {
  artists: {
    include: { artist: true }
  },
  covers: {
    where: { status: ContentStatus.APPROVED },
    include: {
      performers: {
        include: {
          performer: {
            include: {
              group: true
            }
          }
        }
      }
    },
    orderBy: { performedAt: "desc" }
  }
} satisfies Prisma.SongInclude;

export type SongListItem = Prisma.SongGetPayload<{
  include: typeof songListInclude;
}>;

export async function getSongs(query?: string) {
  const trimmed = query?.trim();

  const songs = await db.song.findMany({
    where: trimmed
      ? {
          OR: [
            { title: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
            {
              artists: {
                some: {
                  artist: { name: { contains: trimmed, mode: Prisma.QueryMode.insensitive } }
                }
              }
            }
          ]
        }
      : {},
    include: songListInclude,
    orderBy: { title: "asc" }
  });

  if (!trimmed || songs.length > 0) {
    return songs;
  }

  return findSongsBySimilarity(trimmed);
}

// contains検索が0件のときのみ実行する pg_trgm ベースの類似検索フォールバック。
// pg_trgm 未適用のDBでも検索ページ全体が落ちないよう、失敗時は空配列を返す。
async function findSongsBySimilarity(query: string) {
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "songs"
      WHERE similarity(title, ${query}) > 0.2
      ORDER BY similarity(title, ${query}) DESC
      LIMIT 20
    `;

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const songs = await db.song.findMany({
      where: { id: { in: ids } },
      include: songListInclude
    });
    const order = new Map(ids.map((id, index) => [id, index]));

    return songs.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } catch (error) {
    console.error("Song similarity search failed", error);
    return [];
  }
}

export async function getSongById(id: string) {
  return db.song.findUnique({
    where: { id },
    include: songDetailInclude
  });
}

export async function getRelatedSongsByArtist(artistIds: string[], excludeSongId: string, limit = 6) {
  if (artistIds.length === 0) {
    return [];
  }

  return db.song.findMany({
    where: {
      artists: { some: { artistId: { in: artistIds } } },
      id: { not: excludeSongId }
    },
    include: songListInclude,
    orderBy: [{ covers: { _count: "desc" } }, { title: "asc" }],
    take: limit
  });
}
