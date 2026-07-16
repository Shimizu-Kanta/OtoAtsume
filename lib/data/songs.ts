import { ContentStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { pageSkip, paginate } from "@/lib/pagination";

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

export type SongSort = "titleAsc" | "titleDesc" | "coverCountDesc";

export type SongSearch = {
  query?: string;
  sort?: SongSort;
};

// 注意（五十音順の精度について）:
// PostgreSQLのデフォルト照合順序では、ひらがな・カタカナ・漢字・英数字が混在する
// タイトルの厳密な五十音順（人間の感覚に合う「あいうえお順」）は再現できない。
// まずは title の文字列順で提供し、精度が問題になった場合は Song / Performer に
// よみがな（reading）カラムを追加してそちらでソートする対応を検討する。
function songOrderBy(sort: SongSort | undefined): Prisma.SongOrderByWithRelationInput[] {
  if (sort === "titleDesc") {
    return [{ title: "desc" }];
  }

  // Prisma の orderBy はリレーション件数にステータス条件を掛けられないため、
  // 全ステータスのカバー件数で並ぶ（承認済み以外はごく少数のため近似として許容）。
  if (sort === "coverCountDesc") {
    return [{ covers: { _count: "desc" } }, { title: "asc" }];
  }

  return [{ title: "asc" }];
}

export async function getSongs(search: SongSearch = {}, page = 1, perPage = 20) {
  const trimmed = search.query?.trim();
  const where: Prisma.SongWhereInput = trimmed
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
    : {};

  const [items, totalCount] = await Promise.all([
    db.song.findMany({
      where,
      include: songListInclude,
      orderBy: songOrderBy(search.sort),
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.song.count({ where })
  ]);

  if (!trimmed || totalCount > 0) {
    return paginate(items, totalCount, page, perPage);
  }

  const similar = await findSongsBySimilarity(trimmed);
  return paginate(
    similar.slice(pageSkip(page, perPage), pageSkip(page, perPage) + perPage),
    similar.length,
    page,
    perPage
  );
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
