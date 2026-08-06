import { ContentStatus, MasterDataStatus, Prisma } from "@prisma/client";

import { summarizeCoverTypeCounts, summarizeYearlyCounts } from "@/lib/content-summary";
import { db } from "@/lib/db";
import { pageSkip, paginate } from "@/lib/pagination";

export const performerListInclude = {
  group: true,
  aliases: true,
  tags: {
    include: { tag: true },
    orderBy: { tag: { name: "asc" } }
  },
  _count: {
    select: {
      covers: {
        where: {
          cover: { status: ContentStatus.APPROVED }
        }
      }
    }
  }
} satisfies Prisma.PerformerInclude;

export const performerDetailInclude = {
  group: true,
  aliases: true,
  tags: {
    include: { tag: true },
    orderBy: { tag: { name: "asc" } }
  },
  covers: {
    where: {
      cover: { status: ContentStatus.APPROVED }
    },
    include: {
      cover: {
        include: {
          song: {
            include: {
              artists: {
                include: { artist: true }
              }
            }
          }
        }
      }
    },
    orderBy: {
      cover: { performedAt: "desc" }
    }
  }
} satisfies Prisma.PerformerInclude;

export type PerformerListItem = Prisma.PerformerGetPayload<{
  include: typeof performerListInclude;
}>;

export type PerformerSort = "nameAsc" | "debutDateAsc" | "debutDateDesc" | "coverCountDesc";

export type PerformerSearch = {
  query?: string;
  tagIds?: string[];
  sort?: PerformerSort;
};

function performerOrderBy(sort: PerformerSort | undefined): Prisma.PerformerOrderByWithRelationInput[] {
  if (sort === "debutDateAsc") {
    return [{ debutDate: { sort: "asc", nulls: "last" } }, { name: "asc" }];
  }

  if (sort === "debutDateDesc") {
    return [{ debutDate: { sort: "desc", nulls: "last" } }, { name: "asc" }];
  }

  // 注意: Prisma の orderBy はリレーション件数に where を適用できないため、
  // ここで並び替えに使われる件数は CoverPerformer の全行（HIDDEN / REJECTED を含む）で、
  // 一覧に表示される _count（APPROVED のみ）とは集計範囲が一致しない。
  // 現状ほぼ全ての歌唱記録が APPROVED のため実害は出ない見込み。
  // 非公開記録が増えて順序の食い違いが目立つ場合は、CoverPerformer を
  // status=APPROVED で groupBy して performerId 順を先に確定させる方式へ差し替える。
  if (sort === "coverCountDesc") {
    return [{ covers: { _count: "desc" } }, { name: "asc" }];
  }

  return [{ name: "asc" }];
}

export async function getPerformers(search: PerformerSearch = {}, page = 1, perPage = 20) {
  const query = search.query?.trim();
  const tagIds = search.tagIds?.map((tag) => tag.trim()).filter(Boolean) ?? [];

  const where: Prisma.PerformerWhereInput = {
    status: MasterDataStatus.APPROVED,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
            {
              aliases: {
                some: { alias: { contains: query, mode: Prisma.QueryMode.insensitive } }
              }
            },
            { group: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } }
          ]
        }
      : {}),
    ...(tagIds.length > 0
      ? {
          tags: {
            some: {
              tagId: { in: tagIds }
            }
          }
        }
      : {})
  };

  const [items, totalCount] = await Promise.all([
    db.performer.findMany({
      where,
      include: performerListInclude,
      orderBy: performerOrderBy(search.sort),
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.performer.count({ where })
  ]);

  if (!query || totalCount > 0) {
    return paginate(items, totalCount, page, perPage);
  }

  const similar = await findPerformersBySimilarity(query, tagIds);
  return paginate(
    similar.slice(pageSkip(page, perPage), pageSkip(page, perPage) + perPage),
    similar.length,
    page,
    perPage
  );
}

// contains検索（名前・別名・グループ名）が0件のときのみ実行する
// pg_trgm ベースの類似検索フォールバック。
// pg_trgm 未適用のDBでも検索ページ全体が落ちないよう、失敗時は空配列を返す。
async function findPerformersBySimilarity(query: string, tagIds: string[]) {
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "performers"
      WHERE similarity(name, ${query}) > 0.2
      ORDER BY similarity(name, ${query}) DESC
      LIMIT 20
    `;

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const performers = await db.performer.findMany({
      where: {
        id: { in: ids },
        status: MasterDataStatus.APPROVED,
        ...(tagIds.length > 0
          ? {
              tags: {
                some: {
                  tagId: { in: tagIds }
                }
              }
            }
          : {})
      },
      include: performerListInclude
    });
    const order = new Map(ids.map((id, index) => [id, index]));

    return performers.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } catch (error) {
    console.error("Performer similarity search failed", error);
    return [];
  }
}

export async function getPerformerOptions() {
  return db.performer.findMany({
    where: { status: MasterDataStatus.APPROVED },
    select: { id: true, name: true, group: { select: { name: true } } },
    orderBy: { name: "asc" }
  });
}

export async function getPerformerById(id: string) {
  return db.performer.findFirst({
    where: { id, status: MasterDataStatus.APPROVED },
    include: performerDetailInclude
  });
}

// 確認待ち（PENDING）活動者ページで専用の案内を出すため、ステータスを問わず取得する。
// performerDetailInclude の covers は APPROVED の歌唱記録のみを含むため、
// 非公開の歌唱記録が漏れることはない。
export async function getPerformerByIdAnyStatus(id: string) {
  return db.performer.findFirst({
    where: { id },
    include: performerDetailInclude
  });
}

export type GroupPerformersOptions = {
  excludePerformerId?: string;
  excludePerformerIds?: string[];
  take?: number;
};

export async function getGroupPerformers(groupId: string, options: GroupPerformersOptions = {}) {
  const excludeIds = Array.from(
    new Set([
      ...(options.excludePerformerId ? [options.excludePerformerId] : []),
      ...(options.excludePerformerIds ?? [])
    ])
  );

  return db.performer.findMany({
    where: {
      groupId,
      status: MasterDataStatus.APPROVED,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {})
    },
    include: performerListInclude,
    orderBy: { name: "asc" },
    ...(options.take ? { take: options.take } : {})
  });
}

// 同じタグを共有する他の活動者を、共有タグ数の多い順に返す（同期・同ユニット向け）。
// _count.covers の where 句は performerListInclude と同じ（APPROVED のみ）に揃えている。
export async function getPerformersWithSharedTags(
  performerId: string,
  tagIds: string[],
  limit = 6
) {
  if (tagIds.length === 0) {
    return [];
  }

  // 共有タグ数で並べたいため、候補を多めに取得してメモリ上でソートする。
  const candidates = await db.performer.findMany({
    where: {
      status: MasterDataStatus.APPROVED,
      id: { not: performerId },
      tags: { some: { tagId: { in: tagIds } } }
    },
    include: performerListInclude,
    take: limit * 4
  });

  const tagIdSet = new Set(tagIds);

  return candidates
    .map((performer) => ({
      performer,
      sharedTagCount: performer.tags.filter(({ tagId }) => tagIdSet.has(tagId)).length
    }))
    .sort(
      (a, b) =>
        b.sharedTagCount - a.sharedTagCount ||
        a.performer.name.localeCompare(b.performer.name, "ja")
    )
    .slice(0, limit)
    .map(({ performer }) => performer);
}

export async function getGroupPerformerCount(groupId: string) {
  return db.performer.count({
    where: { groupId, status: MasterDataStatus.APPROVED }
  });
}

export async function getPerformerStats(performerId: string) {
  const links = await db.coverPerformer.findMany({
    where: { performerId, cover: { status: ContentStatus.APPROVED } },
    select: {
      cover: {
        select: {
          songId: true,
          performedAt: true,
          coverType: true,
          song: {
            select: {
              artists: { select: { artist: { select: { id: true, name: true } } } }
            }
          }
        }
      }
    }
  });

  const covers = links.map((link) => link.cover);
  const songIds = new Set(covers.map((cover) => cover.songId));
  const artistCounts = new Map<string, { name: string; count: number }>();

  for (const cover of covers) {
    for (const { artist } of cover.song.artists) {
      const existing = artistCounts.get(artist.id);
      if (existing) {
        existing.count += 1;
      } else {
        artistCounts.set(artist.id, { name: artist.name, count: 1 });
      }
    }
  }

  const byDate = [...covers].sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime());

  return {
    totalCoverCount: covers.length,
    songCount: songIds.size,
    firstPerformedAt: byDate.length > 0 ? byDate[0].performedAt : null,
    latestPerformedAt: byDate.length > 0 ? byDate[byDate.length - 1].performedAt : null,
    coverTypeBreakdown: summarizeCoverTypeCounts(covers.map((cover) => cover.coverType)),
    topArtists: Array.from(artistCounts.entries())
      .map(([artistId, value]) => ({ artistId, name: value.name, count: value.count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"))
      .slice(0, 5),
    yearlyBreakdown: summarizeYearlyCounts(covers.map((cover) => cover.performedAt))
  };
}

// 同一 Cover に紐づく他の活動者（CoverPerformer 経由）を共演回数の多い順に返す。
export async function getCoPerformers(performerId: string, limit = 6) {
  const coverLinks = await db.coverPerformer.findMany({
    where: { performerId, cover: { status: ContentStatus.APPROVED } },
    select: { coverId: true }
  });
  const coverIds = coverLinks.map((link) => link.coverId);

  if (coverIds.length === 0) {
    return [];
  }

  const coLinks = await db.coverPerformer.findMany({
    where: {
      coverId: { in: coverIds },
      performerId: { not: performerId },
      performer: { status: MasterDataStatus.APPROVED }
    },
    select: {
      performer: {
        select: { id: true, name: true, colorCode: true, group: { select: { name: true } } }
      }
    }
  });

  const counts = new Map<
    string,
    { name: string; colorCode: string | null; groupName: string | null; count: number }
  >();
  for (const { performer } of coLinks) {
    const existing = counts.get(performer.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(performer.id, {
        name: performer.name,
        colorCode: performer.colorCode,
        groupName: performer.group?.name ?? null,
        count: 1
      });
    }
  }

  return Array.from(counts.entries())
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"))
    .slice(0, limit);
}
