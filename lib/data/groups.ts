import { ContentStatus, MasterDataStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { coverListInclude, getRandomCovers } from "@/lib/data/covers";
import { pageSkip, paginate } from "@/lib/pagination";

function groupCoverWhere(groupId: string): Prisma.CoverWhereInput {
  return {
    status: ContentStatus.APPROVED,
    performers: {
      some: {
        performer: { groupId, status: MasterDataStatus.APPROVED }
      }
    }
  };
}

export type GroupSort = "nameAsc" | "performerCountDesc";

function groupOrderBy(sort: GroupSort | undefined): Prisma.GroupOrderByWithRelationInput[] {
  // Prisma の orderBy はリレーション件数にステータス条件を掛けられないため、
  // 承認済み以外も含む全活動者数で並ぶ（承認済み以外はごく少数のため近似として許容）。
  if (sort === "performerCountDesc") {
    return [{ performers: { _count: "desc" } }, { name: "asc" }];
  }

  return [{ name: "asc" }];
}

export async function getGroups(sort: GroupSort = "nameAsc", page = 1, perPage = 20) {
  const where: Prisma.GroupWhereInput = {
    performers: { some: { status: MasterDataStatus.APPROVED } }
  };

  const [items, totalCount] = await Promise.all([
    db.group.findMany({
      where,
      include: {
        _count: {
          select: {
            performers: {
              where: { status: MasterDataStatus.APPROVED }
            }
          }
        }
      },
      orderBy: groupOrderBy(sort),
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.group.count({ where })
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function getGroupById(id: string) {
  return db.group.findUnique({
    where: { id }
  });
}

export async function getGroupCoverCount(groupId: string) {
  return db.cover.count({
    where: groupCoverWhere(groupId)
  });
}

export async function getGroupLatestCovers(groupId: string, take = 12) {
  return db.cover.findMany({
    where: groupCoverWhere(groupId),
    include: coverListInclude,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    take
  });
}

export async function getGroupRandomCovers(groupId: string, take = 6) {
  return getRandomCovers(take, {
    performers: {
      some: {
        performer: { groupId, status: MasterDataStatus.APPROVED }
      }
    }
  });
}
