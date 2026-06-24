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
  return db.song.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
            {
              artists: {
                some: {
                  artist: { name: { contains: query, mode: Prisma.QueryMode.insensitive } }
                }
              }
            }
          ]
        }
      : {},
    include: songListInclude,
    orderBy: { title: "asc" }
  });
}

export async function getSongById(id: string) {
  return db.song.findUnique({
    where: { id },
    include: songDetailInclude
  });
}
