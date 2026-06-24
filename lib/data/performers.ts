import { ContentStatus, MasterDataStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export const performerListInclude = {
  group: true,
  aliases: true,
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

export async function getPerformers(query?: string) {
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
        : {})
    },
    include: performerListInclude,
    orderBy: { name: "asc" }
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
