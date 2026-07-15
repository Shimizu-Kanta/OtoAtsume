import { ContentStatus, MasterDataStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

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

export type PerformerSort = "nameAsc" | "debutDateAsc" | "debutDateDesc";

export type PerformerSearch = {
  query?: string;
  tagNames?: string[];
  sort?: PerformerSort;
};

function performerOrderBy(sort: PerformerSort | undefined): Prisma.PerformerOrderByWithRelationInput[] {
  if (sort === "debutDateAsc") {
    return [{ debutDate: { sort: "asc", nulls: "last" } }, { name: "asc" }];
  }

  if (sort === "debutDateDesc") {
    return [{ debutDate: { sort: "desc", nulls: "last" } }, { name: "asc" }];
  }

  return [{ name: "asc" }];
}

export async function getPerformers(search: PerformerSearch = {}) {
  const query = search.query?.trim();
  const tagNames = search.tagNames?.map((tag) => tag.trim()).filter(Boolean) ?? [];

  const performers = await db.performer.findMany({
    where: {
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
      ...(tagNames.length > 0
        ? {
            tags: {
              some: {
                tag: { name: { in: tagNames } }
              }
            }
          }
        : {})
    },
    include: performerListInclude,
    orderBy: performerOrderBy(search.sort)
  });

  if (!query || performers.length > 0) {
    return performers;
  }

  return findPerformersBySimilarity(query, tagNames);
}

// contains検索（名前・別名・グループ名）が0件のときのみ実行する
// pg_trgm ベースの類似検索フォールバック。
// pg_trgm 未適用のDBでも検索ページ全体が落ちないよう、失敗時は空配列を返す。
async function findPerformersBySimilarity(query: string, tagNames: string[]) {
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
        ...(tagNames.length > 0
          ? {
              tags: {
                some: {
                  tag: { name: { in: tagNames } }
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

export type GroupPerformersOptions = {
  excludePerformerId?: string;
  take?: number;
};

export async function getGroupPerformers(groupId: string, options: GroupPerformersOptions = {}) {
  return db.performer.findMany({
    where: {
      groupId,
      status: MasterDataStatus.APPROVED,
      ...(options.excludePerformerId ? { id: { not: options.excludePerformerId } } : {})
    },
    include: performerListInclude,
    orderBy: { name: "asc" },
    ...(options.take ? { take: options.take } : {})
  });
}

export async function getGroupPerformerCount(groupId: string) {
  return db.performer.count({
    where: { groupId, status: MasterDataStatus.APPROVED }
  });
}
