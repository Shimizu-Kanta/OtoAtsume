import { ContentStatus, Prisma } from "@prisma/client";

import { summarizeCoverTypeCounts, summarizeYearlyCounts } from "@/lib/content-summary";
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

export async function getSongStats(songId: string) {
  const covers = await db.cover.findMany({
    where: { songId, status: ContentStatus.APPROVED },
    select: {
      performedAt: true,
      coverType: true,
      performers: { select: { performerId: true } }
    },
    orderBy: { performedAt: "asc" }
  });

  const performerIds = new Set<string>();
  for (const cover of covers) {
    for (const performer of cover.performers) {
      performerIds.add(performer.performerId);
    }
  }

  return {
    totalCoverCount: covers.length,
    performerCount: performerIds.size,
    firstPerformedAt: covers.length > 0 ? covers[0].performedAt : null,
    latestPerformedAt: covers.length > 0 ? covers[covers.length - 1].performedAt : null,
    coverTypeBreakdown: summarizeCoverTypeCounts(covers.map((cover) => cover.coverType)),
    yearlyBreakdown: summarizeYearlyCounts(covers.map((cover) => cover.performedAt))
  };
}

// 同一 sourceUrl（同じ配信・ライブ）に紐づく別楽曲を共起数の多い順に返す。
// 歌枠は1配信に複数曲が含まれるため、この共起データはこのサイト固有の付加価値になる。
export async function getCoOccurringSongs(songId: string, limit = 6) {
  const sourceRows = await db.cover.findMany({
    where: { songId, status: ContentStatus.APPROVED },
    select: { sourceUrl: true }
  });
  const sourceUrls = Array.from(new Set(sourceRows.map((row) => row.sourceUrl)));

  if (sourceUrls.length === 0) {
    return [];
  }

  const coOccurring = await db.cover.findMany({
    where: {
      status: ContentStatus.APPROVED,
      sourceUrl: { in: sourceUrls },
      songId: { not: songId }
    },
    select: {
      songId: true,
      song: {
        include: { artists: { include: { artist: true } } }
      }
    }
  });

  const counts = new Map<string, { title: string; artistNames: string; count: number }>();
  for (const cover of coOccurring) {
    const existing = counts.get(cover.songId);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(cover.songId, {
        title: cover.song.title,
        artistNames: cover.song.artists.map(({ artist }) => artist.name).join(", "),
        count: 1
      });
    }
  }

  return Array.from(counts.entries())
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ja"))
    .slice(0, limit);
}
