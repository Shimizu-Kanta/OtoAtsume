import {
  ContentStatus,
  CoverType,
  MasterDataStatus,
  Prisma,
  PrismaClient,
  ReportReason
} from "@prisma/client";

import { evaluateCoverQuality } from "@/lib/content-quality";
import { syncCandidateStatusForVideo } from "@/lib/crawl/candidate-status";
import { db } from "@/lib/db";
import { pageSkip, paginate, type Paginated } from "@/lib/pagination";
import { escapeLikePattern, normalizeNames } from "@/lib/utils";
import { extractYouTubeVideoId, normalizeYouTubeSourceUrl } from "@/lib/youtube";
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

export type CoverSort = "performedAtDesc" | "performedAtAsc" | "addedAtDesc";

// カード表示用に、同一動画（sourceVideoId）の歌唱記録を1枚の「アルバム」としてまとめた単位。
// 歌ってみた1本のような単曲は totalTrackCount === 1 のアルバムとして扱う。
export type CoverAlbum = {
  // sourceVideoId、無ければ代表 cover の id。
  key: string;
  sourceVideoId: string | null;
  sourceUrl: string;
  sourceTitle: string | null;
  coverType: CoverType;
  performedAt: Date;
  // 収録曲の createdAt の最大値（「最新入荷」の判断材料）。
  lastAddedAt: Date;
  // 検索条件に一致した曲のみ。タイムスタンプ昇順。
  tracks: CoverListItem[];
  // 検索条件を無視した、この動画の登録曲総数。
  // 楽曲名で検索したときに「12曲中1曲が一致」と表示できるよう tracks とは別に持つ。
  totalTrackCount: number;
};

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
  return { contains: escapeLikePattern(value), mode: Prisma.QueryMode.insensitive };
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

  // 指定タグのいずれかを持つ活動者が歌っている歌唱記録（活動者一覧側と同じ OR 挙動）。
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

  // 「最新入荷」。配信日順だと「2年前の配信に今日12曲追加した」ものが一覧に出てこないため、
  // 登録日順を別軸として用意する。
  if (sort === "addedAtDesc") {
    return [{ createdAt: "desc" }];
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

// カード表示用に、同一動画の歌唱記録を1枚のアルバムとしてまとめて返す。
// グループ単位でページングするため、二段構えのクエリにしている。
//
// なぜ第1段でスカラー3列を全件取得しているか:
//   sourceVideoId が nullable なため、Prisma の groupBy では null のレコードが
//   全部ひとつのグループに潰れてしまう。回避するには COALESCE(source_video_id, id) の
//   生成列を足すか raw SQL を書く必要があるが、現在のカバー件数(300件規模)では
//   3列だけの全件取得のほうがはるかに単純で速い。
//   カバー件数が5,000件を超えたらこの方式は見直すこと。その時点で albumKey カラム
//   (sourceVideoId ?? id を書き込み時に同期)を追加し、groupBy + skip/take に切り替える。
export async function getApprovedCoverAlbums(
  search: CoverSearch = {},
  page = 1,
  perPage = 24
): Promise<Paginated<CoverAlbum>> {
  const where = buildCoverWhere(search, true);

  // 第1段: 並び順を保ったままアルバムキーの一覧を作る。
  const keyRows = await db.cover.findMany({
    where,
    select: { id: true, sourceVideoId: true, createdAt: true },
    orderBy: coverOrderBy(search.sort)
  });

  const orderedKeys: string[] = [];
  const sourceVideoIdByKey = new Map<string, string | null>();
  const lastAddedAtByKey = new Map<string, Date>();

  for (const row of keyRows) {
    const key = row.sourceVideoId ?? row.id;
    const lastAddedAt = lastAddedAtByKey.get(key);

    if (lastAddedAt === undefined) {
      orderedKeys.push(key);
      sourceVideoIdByKey.set(key, row.sourceVideoId);
      lastAddedAtByKey.set(key, row.createdAt);
    } else if (row.createdAt > lastAddedAt) {
      lastAddedAtByKey.set(key, row.createdAt);
    }
  }

  const totalCount = orderedKeys.length;
  const skip = pageSkip(page, perPage);
  const pageKeys = orderedKeys.slice(skip, skip + perPage);

  if (pageKeys.length === 0) {
    return paginate<CoverAlbum>([], totalCount, page, perPage);
  }

  const videoIds: string[] = [];
  const soloIds: string[] = [];

  for (const key of pageKeys) {
    const sourceVideoId = sourceVideoIdByKey.get(key) ?? null;

    if (sourceVideoId) {
      videoIds.push(sourceVideoId);
    } else {
      soloIds.push(key);
    }
  }

  const [trackRows, trackCountRows] = await Promise.all([
    // 第2段: そのページのアルバムの中身。where を再適用するため、
    // tracks には検索条件に一致した曲だけが入る。
    db.cover.findMany({
      where: {
        AND: [where, { OR: [{ sourceVideoId: { in: videoIds } }, { id: { in: soloIds } }] }]
      },
      include: coverListInclude,
      orderBy: [{ timestampSeconds: { sort: "asc", nulls: "last" } }, { performedAt: "asc" }]
    }),
    // 第3段: 検索条件を無視した総曲数。soloIds 側は 1 固定なので問い合わせない。
    videoIds.length > 0
      ? db.cover.groupBy({
          by: ["sourceVideoId"],
          where: { status: ContentStatus.APPROVED, sourceVideoId: { in: videoIds } },
          _count: { _all: true }
        })
      : Promise.resolve([])
  ]);

  const tracksByKey = new Map<string, CoverListItem[]>();
  for (const track of trackRows) {
    const key = track.sourceVideoId ?? track.id;
    const tracks = tracksByKey.get(key);

    if (tracks) {
      tracks.push(track);
    } else {
      tracksByKey.set(key, [track]);
    }
  }

  const totalTrackCountByVideoId = new Map<string, number>();
  for (const row of trackCountRows) {
    if (row.sourceVideoId) {
      totalTrackCountByVideoId.set(row.sourceVideoId, row._count._all);
    }
  }

  // 第1段のキー配列の順序を維持する。
  const albums = pageKeys.flatMap<CoverAlbum>((key) => {
    const tracks = tracksByKey.get(key);

    if (!tracks || tracks.length === 0) {
      return [];
    }

    const head = tracks[0];
    const sourceVideoId = sourceVideoIdByKey.get(key) ?? null;

    return [
      {
        key,
        sourceVideoId,
        sourceUrl: head.sourceUrl,
        sourceTitle: head.sourceTitle,
        coverType: head.coverType,
        performedAt: head.performedAt,
        lastAddedAt: lastAddedAtByKey.get(key) ?? head.createdAt,
        tracks,
        totalTrackCount: sourceVideoId
          ? totalTrackCountByVideoId.get(sourceVideoId) ?? tracks.length
          : 1
      }
    ];
  });

  return paginate(albums, totalCount, page, perPage);
}

// 「最新入荷」棚用の間引き。まとめて登録作業をした日は入荷棚が1人の活動者で
// 埋まってしまうため、同一活動者は maxPerPerformer 枚までにして take 枚に絞る。
// 活動者の判定は代表1人（tracks[0].performers[0]）で足りる（コラボも代表で数える）。
// 並び順は入力のまま維持する。
export function limitAlbumsPerPerformer(
  albums: CoverAlbum[],
  take: number,
  maxPerPerformer = 2
): CoverAlbum[] {
  const countByPerformerId = new Map<string, number>();
  const picked: CoverAlbum[] = [];

  for (const album of albums) {
    if (picked.length >= take) {
      break;
    }

    const performerId = album.tracks[0]?.performers[0]?.performer.id;

    // 活動者が紐づいていない記録は間引きの対象外（潰さずそのまま出す）。
    if (performerId) {
      const count = countByPerformerId.get(performerId) ?? 0;

      if (count >= maxPerPerformer) {
        continue;
      }

      countByPerformerId.set(performerId, count + 1);
    }

    picked.push(album);
  }

  return picked;
}

// CoverListItem の配列を、曲数バッジが機能するよう CoverAlbum 形状に詰め直す。
// tracks はその1件のみなので、呼び出し側の表示は totalTrackCount > tracks.length の
// 「代表1曲のみ」ケースになる（CoverAlbumCard 側で裏ジャケを開かない分岐に入る）。
export async function attachTrackCounts(covers: CoverListItem[]): Promise<CoverAlbum[]> {
  const videoIds = Array.from(
    new Set(covers.map((cover) => cover.sourceVideoId).filter((id): id is string => Boolean(id)))
  );

  const trackCountRows =
    videoIds.length > 0
      ? await db.cover.groupBy({
          by: ["sourceVideoId"],
          where: { status: ContentStatus.APPROVED, sourceVideoId: { in: videoIds } },
          _count: { _all: true }
        })
      : [];

  const totalTrackCountByVideoId = new Map<string, number>();
  for (const row of trackCountRows) {
    if (row.sourceVideoId) {
      totalTrackCountByVideoId.set(row.sourceVideoId, row._count._all);
    }
  }

  return covers.map((cover) => ({
    key: cover.sourceVideoId ?? cover.id,
    sourceVideoId: cover.sourceVideoId,
    sourceUrl: cover.sourceUrl,
    sourceTitle: cover.sourceTitle,
    coverType: cover.coverType,
    performedAt: cover.performedAt,
    lastAddedAt: cover.createdAt,
    tracks: [cover],
    totalTrackCount: cover.sourceVideoId
      ? totalTrackCountByVideoId.get(cover.sourceVideoId) ?? 1
      : 1
  }));
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

// 同じ配信・ライブ（同一動画）の他の歌唱記録を、タイムスタンプ順で返す。
// sourceUrl の文字列一致ではなく sourceVideoId で突合するため、
// t=・si=・list= などクエリパラメータのわずかな違いに影響されない。
export async function getOtherCoversBySourceVideoId(sourceVideoId: string, excludeCoverId: string) {
  return db.cover.findMany({
    where: {
      sourceVideoId,
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

// 単一歌唱記録の関連件数（同楽曲 / 同活動者 / 同 sourceUrl の他記録数）。
// generateMetadata の noindex 判定に使う。すべて自身を除いた APPROVED 件数。
export async function getCoverRelationCounts(cover: {
  id: string;
  songId: string;
  sourceUrl: string;
  sourceVideoId: string | null;
  performers: { performerId: string }[];
}) {
  const performerIds = cover.performers.map((performer) => performer.performerId);
  // 同一動画は sourceVideoId で数える（URL 表記揺れの影響を受けない）。
  const sourceMatch = cover.sourceVideoId
    ? { sourceVideoId: cover.sourceVideoId }
    : { sourceUrl: cover.sourceUrl };

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
      where: { status: ContentStatus.APPROVED, id: { not: cover.id }, ...sourceMatch }
    })
  ]);

  return { sameSongCount, samePerformerCount, sameSourceCount };
}

// sitemap 用に、index 対象（孤立していない）の APPROVED 歌唱記録だけを一括判定して返す。
// 全歌唱記録を1度だけ取得し、songId / sourceUrl / performerId ごとの件数を Map 化して
// 各歌唱記録を O(1) で判定する（N+1 を避ける）。generateMetadata と同じ evaluateCoverQuality を使う。
export async function getIndexableCoverSitemapEntries() {
  const covers = await db.cover.findMany({
    where: { status: ContentStatus.APPROVED },
    select: {
      id: true,
      updatedAt: true,
      songId: true,
      sourceUrl: true,
      sourceVideoId: true,
      performers: { select: { performerId: true } }
    }
  });

  const songCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const performerToCoverIds = new Map<string, string[]>();
  // 同一動画は sourceVideoId でまとめる（無ければ sourceUrl をキーにする）。
  const sourceKeyOf = (cover: { sourceVideoId: string | null; sourceUrl: string }) =>
    cover.sourceVideoId ?? cover.sourceUrl;

  for (const cover of covers) {
    songCounts.set(cover.songId, (songCounts.get(cover.songId) ?? 0) + 1);
    const sourceKey = sourceKeyOf(cover);
    sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) ?? 0) + 1);
    for (const { performerId } of cover.performers) {
      const list = performerToCoverIds.get(performerId) ?? [];
      list.push(cover.id);
      performerToCoverIds.set(performerId, list);
    }
  }

  return covers
    .filter((cover) => {
      const sameSongCount = (songCounts.get(cover.songId) ?? 1) - 1;
      const sameSourceCount = (sourceCounts.get(sourceKeyOf(cover)) ?? 1) - 1;

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

  // 同一動画由来の記録は createdAt が近接する（一括登録）ため、ウィンドウを広めに取る。
  const windowSize = Math.min(Math.max(take * 6, take), total);
  const maxSkip = Math.max(0, total - windowSize);
  const skip = maxSkip > 0 ? Math.floor(Math.random() * (maxSkip + 1)) : 0;

  const covers = await db.cover.findMany({
    where: coverWhere,
    include: coverListInclude,
    orderBy: [{ createdAt: "desc" }],
    skip,
    take: windowSize
  });

  // 同じ配信・動画（sourceVideoId、無ければ sourceUrl）から複数曲が同時に並ばないよう、
  // グループごとに代表1件だけを残す（シャッフル済みのため代表はランダム）。
  const seen = new Set<string>();
  const deduped: typeof covers = [];
  for (const cover of shuffleItems(covers)) {
    const key = cover.sourceVideoId ?? cover.sourceUrl;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(cover);
  }

  return deduped.slice(0, take);
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
    where: { title: { equals: escapeLikePattern(title), mode: Prisma.QueryMode.insensitive } }
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
      where: { name: { equals: escapeLikePattern(name), mode: Prisma.QueryMode.insensitive } },
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
  // 同一動画は sourceVideoId で突合する（t=・si= 等の違いで重複を見逃さない）。
  // YouTube 以外の URL は videoId が取れないため sourceUrl の完全一致にフォールバックする。
  const sourceVideoId = extractYouTubeVideoId(input.sourceUrl);
  const sourceMatch = sourceVideoId
    ? { sourceVideoId }
    : { sourceUrl: normalizeYouTubeSourceUrl(input.sourceUrl) };

  const candidates = await db.cover.findMany({
    where: {
      ...sourceMatch,
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
      where: { name: { equals: escapeLikePattern(name), mode: Prisma.QueryMode.insensitive } },
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
    where: { title: { equals: escapeLikePattern(input.songTitle), mode: Prisma.QueryMode.insensitive } },
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

// 既存の厳密な重複判定（sourceUrl 一致が条件）とは別の緩い警告。
// 楽曲 + 活動者 + 歌唱日が一致し、sourceUrl だけが異なる記録を検出する
// （アーカイブと切り抜きなど、同じ歌唱がURL違いで二重登録される事故の保険）。
export async function findSameSingingCandidates(params: {
  songId: string;
  performerIds: string[];
  performedAt: Date;
  excludeSourceUrl: string;
}) {
  if (params.performerIds.length === 0) {
    return [];
  }

  return db.cover.findMany({
    where: {
      songId: params.songId,
      performedAt: params.performedAt,
      performers: { some: { performerId: { in: params.performerIds } } },
      sourceUrl: { not: params.excludeSourceUrl }
    },
    include: coverListInclude,
    take: 3
  });
}

// 単体/一括登録フォームからの入力（未登録の楽曲名・活動者名を含む）に対して緩い重複警告を返す。
export async function findSameSingingCandidatesForInput(input: {
  songTitle: string;
  performerIds: string[];
  performerNames: string;
  performedAt: Date;
  sourceUrl: string;
}) {
  const song = await db.song.findFirst({
    where: { title: { equals: escapeLikePattern(input.songTitle), mode: Prisma.QueryMode.insensitive } },
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

  return findSameSingingCandidates({
    songId: song.id,
    performerIds,
    performedAt: input.performedAt,
    excludeSourceUrl: input.sourceUrl
  });
}

export async function createCover(input: CoverCreateInput, status?: ContentStatus) {
  const artistNames = normalizeNames(input.artistNames);
  const performerNames = normalizeNames(input.performerNames);

  if (artistNames.length === 0) {
    throw new Error("原曲アーティストを指定してください。");
  }

  // 保存直前に sourceUrl を正規化し、内部一致判定用の sourceVideoId を同じ値から導出する。
  const sourceUrl = normalizeYouTubeSourceUrl(input.sourceUrl);
  const sourceVideoId = extractYouTubeVideoId(sourceUrl);

  return db.$transaction(async (client) => {
    const song = await ensureSong(client, input.songTitle, artistNames);
    const performers = await ensurePerformers(client, input.performerIds, performerNames);

    if (performers.length === 0) {
      throw new Error("活動者を指定してください。");
    }

    const cover = await client.cover.create({
      data: {
        songId: song.id,
        performedAt: input.performedAt,
        coverType: input.coverType as CoverType,
        sourceUrl,
        sourceVideoId,
        sourceTitle: input.sourceTitle,
        sourceImageUrl: input.sourceImageUrl,
        timestampSeconds: input.timestampSeconds,
        status: status ?? initialCoverStatus(),
        performers: {
          create: performers.map((performer) => ({
            performerId: performer.id
          }))
        }
      },
      include: coverListInclude
    });

    // 登録実績から歌唱記録候補を自動完了（PENDING → ADOPTED）にする。
    await syncCandidateStatusForVideo(client, sourceUrl, cover.id);

    return cover;
  });
}

export type BulkCoverRow = {
  songTitle: string;
  artistNames: string;
  timestampSeconds?: number;
  performerIds: string[];
  performerNames: string;
};

export type BulkCoverInput = {
  sourceUrl: string;
  sourceTitle?: string;
  sourceImageUrl?: string;
  performedAt: Date;
  coverType: string;
  commonPerformerIds: string[];
  // 公開フォームからの未登録活動者名（全曲共通で登録される）。
  commonPerformerNames?: string;
  rows: BulkCoverRow[];
  // 管理画面のみ明示指定できる。未指定時は initialCoverStatus() が使われる。
  status?: ContentStatus;
};

// 1つの動画URLから複数曲を1トランザクションでまとめて登録する。
// 各行は共通の活動者を使うが、行ごとに上書き（performerIds/Names）もできる。
export async function createBulkCovers(input: BulkCoverInput) {
  if (input.rows.length === 0) {
    throw new Error("登録する曲を1行以上入力してください。");
  }

  // 保存直前に sourceUrl を正規化し、内部一致判定用の sourceVideoId を同じ値から導出する。
  const sourceUrl = normalizeYouTubeSourceUrl(input.sourceUrl);
  const sourceVideoId = extractYouTubeVideoId(sourceUrl);

  const commonPerformerNames = normalizeNames(input.commonPerformerNames ?? "");

  return db.$transaction(async (client) => {
    const created = [];

    for (const [index, row] of input.rows.entries()) {
      const artistNames = normalizeNames(row.artistNames);
      const rowPerformerNames = normalizeNames(row.performerNames);

      if (artistNames.length === 0) {
        throw new Error(`${index + 1}曲目: 原曲アーティストを指定してください。`);
      }

      const song = await ensureSong(client, row.songTitle, artistNames);

      // 行の歌唱者があればそれを、なければ共通の活動者IDを使う。
      // 共通の未登録活動者名（フリー入力）はどちらの場合も全曲に付与する。
      const rowPerformerIds = row.performerIds.length > 0 ? row.performerIds : input.commonPerformerIds;
      const performerNames = [...rowPerformerNames, ...commonPerformerNames];
      const performers = await ensurePerformers(client, rowPerformerIds, performerNames);

      if (performers.length === 0) {
        throw new Error(`${index + 1}曲目: 活動者を指定してください。`);
      }

      const cover = await client.cover.create({
        data: {
          songId: song.id,
          performedAt: input.performedAt,
          coverType: input.coverType as CoverType,
          sourceUrl,
          sourceVideoId,
          sourceTitle: input.sourceTitle,
          sourceImageUrl: input.sourceImageUrl,
          timestampSeconds: row.timestampSeconds,
          status: input.status ?? initialCoverStatus(),
          performers: {
            create: performers.map((performer) => ({ performerId: performer.id }))
          }
        },
        // 呼び出し元（管理画面の登録完了プレビュー等）で楽曲名・活動者名をそのまま
        // 表示できるように、作成直後のレコードを関連込みで返す。
        include: coverListInclude
      });
      created.push(cover);
    }

    // 一括登録は複数の Cover を作るが、候補の自動完了判定は1回でよい。
    await syncCandidateStatusForVideo(client, sourceUrl, created[0]?.id);

    return created;
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

  // 管理画面での編集でも sourceUrl を正規化し、sourceVideoId を同期する。
  const sourceUrl = normalizeYouTubeSourceUrl(input.sourceUrl);
  const sourceVideoId = extractYouTubeVideoId(sourceUrl);

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
        sourceUrl,
        sourceVideoId,
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
