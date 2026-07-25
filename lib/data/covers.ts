import {
  ContentStatus,
  CoverType,
  MasterDataStatus,
  Prisma,
  PrismaClient,
  ReportReason
} from "@prisma/client";

import { evaluateCoverQuality } from "@/lib/content-quality";
import { db } from "@/lib/db";
import { pageSkip, paginate } from "@/lib/pagination";
import { normalizeNames } from "@/lib/utils";
import type {
  AdminCoverEditInput,
  CoverCreateInput,
  CoverUpdateInput,
  DuplicateCandidateInput
} from "@/lib/validations/cover";
import type { ReportCreateInput } from "@/lib/validations/report";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const coverListInclude = {
  song: {
    include: {
      artists: {
        include: {
          artist: true
        }
      }
    }
  },
  performers: {
    include: {
      performer: {
        include: {
          group: true
        }
      }
    }
  }
} satisfies Prisma.CoverInclude;

export const coverDetailInclude = {
  ...coverListInclude,
  reports: true
} satisfies Prisma.CoverInclude;

export type CoverListItem = Prisma.CoverGetPayload<{
  include: typeof coverListInclude;
}>;

export type CoverDetail = Prisma.CoverGetPayload<{
  include: typeof coverDetailInclude;
}>;

export type CoverSort = "performedAtDesc" | "performedAtAsc";

export type CoverSearch = {
  performer?: string;
  song?: string;
  artist?: string;
  dateFrom?: string;
  dateTo?: string;
  coverType?: string;
  status?: string;
  tagIds?: string[];
  sort?: CoverSort;
};

function insensitiveContains(value: string) {
  return { contains: value, mode: Prisma.QueryMode.insensitive };
}

function parseDateStart(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function buildCoverWhere(search: CoverSearch = {}, onlyApproved = true): Prisma.CoverWhereInput {
  const and: Prisma.CoverWhereInput[] = [];

  if (onlyApproved) {
    and.push({ status: ContentStatus.APPROVED });
  } else if (search.status) {
    and.push({ status: search.status as ContentStatus });
  }

  if (search.performer) {
    and.push({
      performers: {
        some: {
          performer: {
            OR: [
              { name: insensitiveContains(search.performer) },
              { aliases: { some: { alias: insensitiveContains(search.performer) } } }
            ]
          }
        }
      }
    });
  }

  if (search.song) {
    and.push({ song: { title: insensitiveContains(search.song) } });
  }

  if (search.artist) {
    and.push({
      song: {
        artists: {
          some: {
            artist: { name: insensitiveContains(search.artist) }
          }
        }
      }
    });
  }

  const dateFrom = parseDateStart(search.dateFrom);
  const dateTo = parseDateEnd(search.dateTo);
  if (dateFrom || dateTo) {
    and.push({
      performedAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {})
      }
    });
  }

  if (search.coverType) {
    and.push({ coverType: search.coverType as CoverType });
  }

  // 指定タグのいずれかを持つ活動者が歌っているカバー記録（活動者一覧側と同じ OR 挙動）。
  if (search.tagIds && search.tagIds.length > 0) {
    and.push({
      performers: {
        some: {
          performer: {
            tags: { some: { tagId: { in: search.tagIds } } }
          }
        }
      }
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function coverOrderBy(sort: CoverSort | undefined): Prisma.CoverOrderByWithRelationInput[] {
  if (sort === "performedAtAsc") {
    return [{ performedAt: "asc" }, { createdAt: "asc" }];
  }

  return [{ performedAt: "desc" }, { createdAt: "desc" }];
}

export async function getApprovedCovers(search: CoverSearch = {}, page = 1, perPage = 20) {
  const where = buildCoverWhere(search, true);

  const [items, totalCount] = await Promise.all([
    db.cover.findMany({
      where,
      include: coverListInclude,
      orderBy: coverOrderBy(search.sort),
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.cover.count({ where })
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function getAdminCovers(search: CoverSearch = {}, page = 1, perPage = 50) {
  const where = buildCoverWhere(search, false);

  const [items, totalCount] = await Promise.all([
    db.cover.findMany({
      where,
      include: coverListInclude,
      orderBy: [{ createdAt: "desc" }],
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.cover.count({ where })
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function getCoverById(id: string, includeHidden = false) {
  return db.cover.findFirst({
    where: {
      id,
      ...(includeHidden ? {} : { status: ContentStatus.APPROVED })
    },
    include: coverDetailInclude
  });
}

export async function getLatestCovers(take = 8) {
  const { items } = await getApprovedCovers({}, 1, take);
  return items;
}

export async function getOtherCoversBySourceUrl(sourceUrl: string, excludeCoverId: string) {
  return db.cover.findMany({
    where: {
      sourceUrl,
      status: ContentStatus.APPROVED,
      id: { not: excludeCoverId }
    },
    include: coverListInclude,
    orderBy: [{ timestampSeconds: { sort: "asc", nulls: "last" } }, { performedAt: "asc" }]
  });
}

export async function getOtherCoversByPerformers(
  performerIds: string[],
  excludeCoverId: string,
  take = 6
) {
  if (performerIds.length === 0) {
    return [];
  }

  return db.cover.findMany({
    where: {
      status: ContentStatus.APPROVED,
      id: { not: excludeCoverId },
      performers: { some: { performerId: { in: performerIds } } }
    },
    include: coverListInclude,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    take
  });
}

export async function getOtherCoversBySong(songId: string, excludeCoverId: string, take = 6) {
  return db.cover.findMany({
    where: {
      status: ContentStatus.APPROVED,
      id: { not: excludeCoverId },
      songId
    },
    include: coverListInclude,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    take
  });
}

// 単一カバーの関連件数（同楽曲 / 同活動者 / 同 sourceUrl の他記録数）。
// generateMetadata の noindex 判定に使う。すべて自身を除いた APPROVED 件数。
export async function getCoverRelationCounts(cover: {
  id: string;
  songId: string;
  sourceUrl: string;
  performers: { performerId: string }[];
}) {
  const performerIds = cover.performers.map((performer) => performer.performerId);

  const [sameSongCount, samePerformerCount, sameSourceCount] = await Promise.all([
    db.cover.count({
      where: { status: ContentStatus.APPROVED, id: { not: cover.id }, songId: cover.songId }
    }),
    performerIds.length > 0
      ? db.cover.count({
          where: {
            status: ContentStatus.APPROVED,
            id: { not: cover.id },
            performers: { some: { performerId: { in: performerIds } } }
          }
        })
      : Promise.resolve(0),
    db.cover.count({
      where: { status: ContentStatus.APPROVED, id: { not: cover.id }, sourceUrl: cover.sourceUrl }
    })
  ]);

  return { sameSongCount, samePerformerCount, sameSourceCount };
}

// sitemap 用に、index 対象（孤立していない）の APPROVED カバーだけを一括判定して返す。
// 全カバーを1度だけ取得し、songId / sourceUrl / performerId ごとの件数を Map 化して
// 各カバーを O(1) で判定する（N+1 を避ける）。generateMetadata と同じ evaluateCoverQuality を使う。
export async function getIndexableCoverSitemapEntries() {
  const covers = await db.cover.findMany({
    where: { status: ContentStatus.APPROVED },
    select: {
      id: true,
      updatedAt: true,
      songId: true,
      sourceUrl: true,
      performers: { select: { performerId: true } }
    }
  });

  const songCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const performerToCoverIds = new Map<string, string[]>();

  for (const cover of covers) {
    songCounts.set(cover.songId, (songCounts.get(cover.songId) ?? 0) + 1);
    sourceCounts.set(cover.sourceUrl, (sourceCounts.get(cover.sourceUrl) ?? 0) + 1);
    for (const { performerId } of cover.performers) {
      const list = performerToCoverIds.get(performerId) ?? [];
      list.push(cover.id);
      performerToCoverIds.set(performerId, list);
    }
  }

  return covers
    .filter((cover) => {
      const sameSongCount = (songCounts.get(cover.songId) ?? 1) - 1;
      const sameSourceCount = (sourceCounts.get(cover.sourceUrl) ?? 1) - 1;

      const relatedCoverIds = new Set<string>();
      for (const { performerId } of cover.performers) {
        for (const coverId of performerToCoverIds.get(performerId) ?? []) {
          if (coverId !== cover.id) {
            relatedCoverIds.add(coverId);
          }
        }
      }

      return evaluateCoverQuality({
        sameSongCount,
        samePerformerCount: relatedCoverIds.size,
        sameSourceCount
      }).isIndexable;
    })
    .map((cover) => ({ id: cover.id, updatedAt: cover.updatedAt }));
}

export type AnniversaryType = "debut" | "birthday";

export type AnniversaryCoverGroup = {
  performer: {
    id: string;
    name: string;
    colorCode: string | null;
    debutDate: Date | null;
    birthday: Date | null;
    group: {
      name: string;
    } | null;
  };
  anniversaryTypes: AnniversaryType[];
  covers: CoverListItem[];
};

export async function getRandomCovers(take = 6, where: Prisma.CoverWhereInput = {}) {
  const coverWhere: Prisma.CoverWhereInput = {
    status: ContentStatus.APPROVED,
    ...where
  };

  const total = await db.cover.count({
    where: coverWhere
  });

  if (total === 0) {
    return [];
  }

  const windowSize = Math.min(Math.max(take * 3, take), total);
  const maxSkip = Math.max(0, total - windowSize);
  const skip = maxSkip > 0 ? Math.floor(Math.random() * (maxSkip + 1)) : 0;

  const covers = await db.cover.findMany({
    where: coverWhere,
    include: coverListInclude,
    orderBy: [{ createdAt: "desc" }],
    skip,
    take: windowSize
  });

  return shuffleItems(covers).slice(0, take);
}

export async function getTodayAnniversaryCoverGroups(takePerPerformer = 3) {
  const today = getTokyoMonthDay(new Date());

  const performers = await db.performer.findMany({
    where: {
      status: MasterDataStatus.APPROVED,
      OR: [
        {
          debutDate: {
            not: null
          }
        },
        {
          birthday: {
            not: null
          }
        }
      ]
    },
    select: {
      id: true,
      name: true,
      colorCode: true,
      debutDate: true,
      birthday: true,
      group: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  const anniversaryPerformers = performers
    .map((performer) => ({
      performer,
      anniversaryTypes: getTodayAnniversaryTypes(performer, today)
    }))
    .filter(({ anniversaryTypes }) => anniversaryTypes.length > 0);

  const groups = await Promise.all(
    anniversaryPerformers.map(async ({ performer, anniversaryTypes }) => {
      const covers = await db.cover.findMany({
        where: {
          status: ContentStatus.APPROVED,
          performers: {
            some: {
              performerId: performer.id
            }
          }
        },
        include: coverListInclude,
        orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
        take: Math.max(takePerPerformer * 4, takePerPerformer)
      });

      return {
        performer,
        anniversaryTypes,
        covers: shuffleItems(covers).slice(0, takePerPerformer)
      };
    })
  );

  return groups;
}

function shuffleItems<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function getTokyoMonthDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { month, day };
}

function getUtcMonthDay(date: Date) {
  return {
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

async function ensureArtist(client: DbClient, name: string) {
  return client.artist.upsert({
    where: { name },
    create: { name },
    update: {}
  });
}

async function ensureSong(client: DbClient, title: string, artistNames: string[]) {
  const existing = await client.song.findFirst({
    where: { title: { equals: title, mode: Prisma.QueryMode.insensitive } }
  });

  const song =
    existing ??
    (await client.song.create({
      data: { title }
    }));

  for (const artistName of artistNames) {
    const artist = await ensureArtist(client, artistName);

    await client.songArtist.upsert({
      where: { songId_artistId: { songId: song.id, artistId: artist.id } },
      create: { songId: song.id, artistId: artist.id },
      update: {}
    });
  }

  return song;
}

async function ensurePerformers(
  client: DbClient,
  performerIds: string[],
  performerNames: string[]
) {
  const performers = new Map<string, { id: string }>();

  if (performerIds.length > 0) {
    const found = await client.performer.findMany({
      where: { id: { in: performerIds } },
      select: { id: true }
    });

    for (const performer of found) {
      performers.set(performer.id, performer);
    }
  }

  for (const name of performerNames) {
    const existing = await client.performer.findFirst({
      where: { name: { equals: name, mode: Prisma.QueryMode.insensitive } },
      select: { id: true }
    });

    const performer =
      existing ??
      (await client.performer.create({
        data: {
          name,
          status: MasterDataStatus.PENDING
        },
        select: { id: true }
      }));

    performers.set(performer.id, performer);
  }

  return Array.from(performers.values());
}

function initialCoverStatus() {
  return ContentStatus.APPROVED;
}

export async function findPotentialDuplicateCovers(input: {
  sourceUrl: string;
  songId: string;
  performerIds: string[];
  performedAt: Date;
  timestampSeconds?: number;
}) {
  const candidates = await db.cover.findMany({
    where: {
      sourceUrl: input.sourceUrl,
      songId: input.songId,
      performedAt: input.performedAt,
      ...(input.timestampSeconds == null ? {} : { timestampSeconds: input.timestampSeconds }),
      performers: {
        some: {
          performerId: { in: input.performerIds }
        }
      }
    },
    include: coverListInclude,
    take: 10
  });

  return candidates.filter((candidate) => {
    const performerIds = candidate.performers
      .map((item) => item.performerId)
      .sort()
      .join(",");
    const inputPerformerIds = [...input.performerIds].sort().join(",");

    return performerIds === inputPerformerIds;
  });
}

async function findExistingPerformerIds(performerIds: string[], performerNames: string[]) {
  const ids = new Set<string>();

  if (performerIds.length > 0) {
    const performers = await db.performer.findMany({
      where: { id: { in: performerIds } },
      select: { id: true }
    });

    for (const performer of performers) {
      ids.add(performer.id);
    }
  }

  for (const name of performerNames) {
    const performer = await db.performer.findFirst({
      where: { name: { equals: name, mode: Prisma.QueryMode.insensitive } },
      select: { id: true }
    });

    if (performer) {
      ids.add(performer.id);
    }
  }

  return Array.from(ids);
}

export async function findPotentialDuplicateCoversForInput(input: DuplicateCandidateInput) {
  const song = await db.song.findFirst({
    where: { title: { equals: input.songTitle, mode: Prisma.QueryMode.insensitive } },
    select: { id: true }
  });

  if (!song) {
    return [];
  }

  const performerIds = await findExistingPerformerIds(
    input.performerIds,
    normalizeNames(input.performerNames)
  );

  if (performerIds.length === 0) {
    return [];
  }

  return findPotentialDuplicateCovers({
    sourceUrl: input.sourceUrl,
    songId: song.id,
    performerIds,
    performedAt: input.performedAt,
    timestampSeconds: input.timestampSeconds
  });
}

export async function createCover(input: CoverCreateInput) {
  const artistNames = normalizeNames(input.artistNames);
  const performerNames = normalizeNames(input.performerNames);

  if (artistNames.length === 0) {
    throw new Error("原曲アーティストを指定してください。");
  }

  return db.$transaction(async (client) => {
    const song = await ensureSong(client, input.songTitle, artistNames);
    const performers = await ensurePerformers(client, input.performerIds, performerNames);

    if (performers.length === 0) {
      throw new Error("活動者を指定してください。");
    }

    return client.cover.create({
      data: {
        songId: song.id,
        performedAt: input.performedAt,
        coverType: input.coverType as CoverType,
        sourceUrl: input.sourceUrl,
        sourceTitle: input.sourceTitle,
        sourceImageUrl: input.sourceImageUrl,
        timestampSeconds: input.timestampSeconds,
        status: initialCoverStatus(),
        performers: {
          create: performers.map((performer) => ({
            performerId: performer.id
          }))
        }
      },
      include: coverListInclude
    });
  });
}

export async function updateCover(id: string, input: CoverUpdateInput) {
  return db.cover.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status as ContentStatus } : {}),
      ...(input.sourceTitle !== undefined ? { sourceTitle: input.sourceTitle } : {})
    },
    include: coverDetailInclude
  });
}

export async function updateAdminCover(id: string, input: AdminCoverEditInput) {
  const artistNames = normalizeNames(input.artistNames);
  const performerNames = normalizeNames(input.performerNames);

  if (artistNames.length === 0) {
    throw new Error("原曲アーティストを指定してください。");
  }

  return db.$transaction(async (client) => {
    const song = await ensureSong(client, input.songTitle, artistNames);
    const performers = await ensurePerformers(client, input.performerIds, performerNames);

    if (performers.length === 0) {
      throw new Error("活動者を指定してください。");
    }

    await client.cover.update({
      where: { id },
      data: {
        songId: song.id,
        performedAt: input.performedAt,
        coverType: input.coverType as CoverType,
        sourceUrl: input.sourceUrl,
        sourceTitle: input.sourceTitle ?? null,
        timestampSeconds: input.timestampSeconds ?? null,
        status: input.status as ContentStatus
      }
    });

    await client.coverPerformer.deleteMany({
      where: { coverId: id }
    });

    await client.coverPerformer.createMany({
      data: performers.map((performer) => ({
        coverId: id,
        performerId: performer.id
      })),
      skipDuplicates: true
    });

    return client.cover.findUniqueOrThrow({
      where: { id },
      include: coverDetailInclude
    });
  });
}

export async function createReport(coverId: string, input: ReportCreateInput) {
  return db.report.create({
    data: {
      coverId,
      reason: input.reason as ReportReason,
      memo: input.memo
    }
  });
}

function getTodayAnniversaryTypes(
  performer: {
    debutDate: Date | null;
    birthday: Date | null;
  },
  today: {
    month: number;
    day: number;
  }
): AnniversaryType[] {
  const types: AnniversaryType[] = [];

  if (performer.debutDate) {
    const debutDate = getUtcMonthDay(performer.debutDate);

    if (debutDate.month === today.month && debutDate.day === today.day) {
      types.push("debut");
    }
  }

  if (performer.birthday) {
    const birthday = getUtcMonthDay(performer.birthday);

    if (birthday.month === today.month && birthday.day === today.day) {
      types.push("birthday");
    }
  }

  return types;
}
