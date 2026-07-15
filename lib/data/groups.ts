import { ContentStatus, MasterDataStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { coverListInclude, getRandomCovers } from "@/lib/data/covers";

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

export async function getGroups() {
  return db.group.findMany({
    where: {
      performers: { some: { status: MasterDataStatus.APPROVED } }
    },
    include: {
      _count: {
        select: {
          performers: {
            where: { status: MasterDataStatus.APPROVED }
          }
        }
      }
    },
    orderBy: { name: "asc" }
  });
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
