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

  return db.performer.findMany({
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
