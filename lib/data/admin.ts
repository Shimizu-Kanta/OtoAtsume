import {
  ContentStatus,
  MasterDataStatus,
  Prisma,
  ReportStatus
} from "@prisma/client";

import { db } from "@/lib/db";
import { coverDetailInclude, coverListInclude } from "@/lib/data/covers";
import { replacePerformerTags } from "@/lib/data/tags";
import { pageSkip, paginate } from "@/lib/pagination";
import { normalizeNames } from "@/lib/utils";

export async function listReports(status?: ReportStatus, page = 1, perPage = 50) {
  const where = status ? { status } : {};

  const [items, totalCount] = await Promise.all([
    db.report.findMany({
      where,
      include: {
        cover: {
          include: coverListInclude
        }
      },
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.report.count({ where })
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function getReport(id: string) {
  return db.report.findUnique({
    where: { id },
    include: {
      cover: {
        include: coverDetailInclude
      }
    }
  });
}

export async function updateReportStatus(id: string, status: ReportStatus) {
  return db.report.update({
    where: { id },
    data: { status }
  });
}

export async function listGroups() {
  return db.group.findMany({
    orderBy: { name: "asc" }
  });
}

export async function listAdminGroups(page = 1, perPage = 50) {
  const [items, totalCount] = await Promise.all([
    db.group.findMany({
      include: {
        _count: {
          select: {
            performers: true
          }
        }
      },
      orderBy: { name: "asc" },
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.group.count()
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function getAdminGroup(id: string) {
  return db.group.findUnique({
    where: { id },
    include: {
      performers: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          status: true,
          youtubeUrl: true,
          officialUrl: true,
          colorCode: true,
          debutDate: true
        }
      },
      _count: {
        select: {
          performers: true
        }
      }
    }
  });
}
export async function createAdminGroup(name: string) {
  return db.group.upsert({
    where: { name },
    create: { name },
    update: {}
  });
}

export async function updateAdminGroup(id: string, name: string) {
  return db.group.update({
    where: { id },
    data: { name }
  });
}

export const performerMissingFieldOptions = [
  { value: "birthday", label: "誕生日未入力" },
  { value: "debutDate", label: "デビュー日未入力" },
  { value: "officialUrl", label: "公式URL未入力" },
  { value: "colorCode", label: "カラーコード未入力" }
] as const;

export type PerformerMissingField = (typeof performerMissingFieldOptions)[number]["value"];

export function normalizePerformerMissingFields(values: string[]): PerformerMissingField[] {
  const allowed = new Set(performerMissingFieldOptions.map((option) => option.value));
  return Array.from(new Set(values)).filter((value): value is PerformerMissingField =>
    allowed.has(value as PerformerMissingField)
  );
}

function buildMissingPerformerFilters(missingFields: PerformerMissingField[]) {
  const filters: Prisma.PerformerWhereInput[] = [];

  if (missingFields.includes("birthday")) {
    filters.push({ birthday: null });
  }

  if (missingFields.includes("debutDate")) {
    filters.push({ debutDate: null });
  }

  if (missingFields.includes("officialUrl")) {
    filters.push({ officialUrl: null });
  }

  if (missingFields.includes("colorCode")) {
    filters.push({ colorCode: null });
  }

  return filters;
}

export type AdminPerformerSearch = {
  query?: string;
  status?: MasterDataStatus;
  missingFields?: PerformerMissingField[];
};

export async function listAdminPerformers(
  search: AdminPerformerSearch = {},
  page = 1,
  perPage = 50
) {
  const keyword = search.query?.trim();
  const filters: Prisma.PerformerWhereInput[] = [];

  if (search.status) {
    filters.push({ status: search.status });
  }

  filters.push(...buildMissingPerformerFilters(search.missingFields ?? []));

  if (keyword) {
    filters.push({
      OR: [
        {
          name: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          youtubeUrl: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          officialUrl: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          group: {
            is: {
              name: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            }
          }
        },
        {
          aliases: {
            some: {
              alias: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            }
          }
        },
        {
          tags: {
            some: {
              tag: {
                name: {
                  contains: keyword,
                  mode: Prisma.QueryMode.insensitive
                }
              }
            }
          }
        }
      ]
    });
  }

  const where = filters.length > 0 ? { AND: filters } : undefined;

  const [items, totalCount] = await Promise.all([
    db.performer.findMany({
      where,
      include: {
        group: true,
        aliases: true,
        tags: {
          include: { tag: true },
          orderBy: { tag: { name: "asc" } }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.performer.count({ where })
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function getAdminPerformer(id: string) {
  return db.performer.findUnique({
    where: { id },
    include: {
      group: true,
      aliases: true,
      tags: {
        include: { tag: true },
        orderBy: { tag: { name: "asc" } }
      },
      _count: {
        select: {
          covers: true
        }
      }
    }
  });
}

export async function createAdminPerformer(input: {
  name: string;
  groupId?: string;
  youtubeUrl?: string;
  officialUrl?: string;
  colorCode?: string;
  debutDate?: Date;
  birthday?: Date;
  tags?: string[];
  status?: MasterDataStatus;
}) {
  return db.$transaction(async (client) => {
    const performer = await client.performer.create({
      data: {
        name: input.name,
        groupId: input.groupId,
        youtubeUrl: input.youtubeUrl,
        officialUrl: input.officialUrl,
        colorCode: input.colorCode,
        debutDate: input.debutDate,
        birthday: input.birthday,
        status: input.status ?? MasterDataStatus.APPROVED
      }
    });

    await replacePerformerTags(client, performer.id, input.tags ?? []);
    return performer;
  });
}

export async function updateAdminPerformer(
  id: string,
  input: Partial<{
    name: string;
    groupId: string | null;
    youtubeUrl: string | null;
    officialUrl: string | null;
    colorCode: string | null;
    debutDate: Date | null;
    birthday: Date | null;
    status: MasterDataStatus;
    aliases: string[];
    tags: string[];
  }>
) {
  return db.$transaction(async (client) => {
    const { aliases, tags, ...performerInput } = input;
    await client.performer.update({
      where: { id },
      data: {
        ...performerInput,
        groupId: performerInput.groupId === "" ? null : performerInput.groupId
      }
    });

    if (aliases) {
      const uniqueAliases = Array.from(new Set(aliases.map((alias) => alias.trim()).filter(Boolean)));
      await client.performerAlias.deleteMany({
        where: { performerId: id }
      });

      if (uniqueAliases.length > 0) {
        await client.performerAlias.createMany({
          data: uniqueAliases.map((alias) => ({ performerId: id, alias })),
          skipDuplicates: true
        });
      }
    }

    if (tags) {
      await replacePerformerTags(client, id, tags);
    }

    return client.performer.findUniqueOrThrow({
      where: { id },
      include: {
        group: true,
        aliases: true,
        tags: {
          include: { tag: true },
          orderBy: { tag: { name: "asc" } }
        }
      }
    });
  });
}

export async function deleteAdminPerformerIfUnused(id: string, confirmName: string) {
  return db.$transaction(async (client) => {
    const performer = await client.performer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            covers: true
          }
        }
      }
    });

    if (!performer) {
      return {
        ok: false as const,
        reason: "notFound" as const
      };
    }

    if (performer.name !== confirmName.trim()) {
      return {
        ok: false as const,
        reason: "nameMismatch" as const,
        name: performer.name
      };
    }

    if (performer._count.covers > 0) {
      return {
        ok: false as const,
        reason: "hasCovers" as const,
        name: performer.name,
        coverCount: performer._count.covers
      };
    }

    await client.performer.delete({
      where: { id }
    });

    return {
      ok: true as const,
      name: performer.name
    };
  });
}

export type AdminSongSearch = {
  missingOriginalUrl?: boolean;
};

export async function listAdminSongs(search: AdminSongSearch = {}, page = 1, perPage = 50) {
  const where: Prisma.SongWhereInput | undefined = search.missingOriginalUrl
    ? { originalUrl: null }
    : undefined;

  const [items, totalCount] = await Promise.all([
    db.song.findMany({
      where,
      include: {
        artists: {
          include: { artist: true }
        },
        _count: {
          select: {
            covers: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.song.count({ where })
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function getAdminSong(id: string) {
  return db.song.findUnique({
    where: { id },
    include: {
      artists: {
        include: { artist: true }
      },
      _count: {
        select: {
          covers: true
        }
      }
    }
  });
}

export async function createAdminSong(input: {
  title: string;
  originalUrl?: string;
  artistIds?: string[];
}) {
  return db.song.create({
    data: {
      title: input.title,
      originalUrl: input.originalUrl,
      artists: {
        create: (input.artistIds ?? []).map((artistId) => ({ artistId }))
      }
    }
  });
}

export async function updateAdminSong(
  id: string,
  input: {
    title?: string;
    originalUrl?: string | null;
    artistIds?: string[];
    artistNames?: string;
  }
) {
  return db.$transaction(async (client) => {
    const existing = await client.song.findUniqueOrThrow({
      where: { id },
      include: {
        artists: {
          select: { artistId: true }
        }
      }
    });
    const shouldReplaceArtists = input.artistIds !== undefined || input.artistNames !== undefined;
    const artistIds = new Set(
      shouldReplaceArtists ? input.artistIds ?? [] : existing.artists.map(({ artistId }) => artistId)
    );

    for (const name of normalizeNames(input.artistNames)) {
      const artist = await client.artist.upsert({
        where: { name },
        create: { name },
        update: {}
      });
      artistIds.add(artist.id);
    }

    await client.song.update({
      where: { id },
      data: {
        title: input.title ?? existing.title,
        originalUrl: input.originalUrl === undefined ? existing.originalUrl : input.originalUrl
      }
    });

    if (shouldReplaceArtists) {
      await client.songArtist.deleteMany({
        where: { songId: id }
      });

      if (artistIds.size > 0) {
        await client.songArtist.createMany({
          data: Array.from(artistIds).map((artistId) => ({
            songId: id,
            artistId
          })),
          skipDuplicates: true
        });
      }
    }

    return client.song.findUniqueOrThrow({
      where: { id },
      include: {
        artists: {
          include: { artist: true }
        }
      }
    });
  });
}

export async function listAdminArtists(page = 1, perPage = 50) {
  const [items, totalCount] = await Promise.all([
    db.artist.findMany({
      include: {
        _count: {
          select: { songs: true }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.artist.count()
  ]);

  return paginate(items, totalCount, page, perPage);
}

// 楽曲追加・編集フォームのアーティスト選択肢用（全件・軽量）。
// 一覧表示のページネーションに影響されず全アーティストを返す。
export async function listArtistOptions() {
  return db.artist.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function getAdminArtist(id: string) {
  return db.artist.findUnique({
    where: { id },
    include: {
      _count: {
        select: { songs: true }
      }
    }
  });
}

export async function createAdminArtist(name: string) {
  return db.artist.upsert({
    where: { name },
    create: { name },
    update: {}
  });
}

export async function updateAdminArtist(id: string, name: string) {
  return db.artist.update({
    where: { id },
    data: { name }
  });
}

export async function updateAdminCoverStatus(id: string, status: ContentStatus) {
  return db.cover.update({
    where: { id },
    data: { status }
  });
}

export async function deleteAdminCover(id: string) {
  const cover = await db.cover.findUnique({
    where: { id },
    select: {
      id: true,
      song: {
        select: {
          title: true
        }
      }
    }
  });

  if (!cover) {
    return { ok: false as const, reason: "notFound" as const };
  }

  await db.cover.delete({
    where: { id }
  });

  return {
    ok: true as const,
    title: cover.song.title
  };
}

export async function deleteAdminSongIfUnused(id: string) {
  const song = await db.song.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          covers: true
        }
      }
    }
  });

  if (!song) {
    return { ok: false as const, reason: "notFound" as const };
  }

  if (song._count.covers > 0) {
    return {
      ok: false as const,
      reason: "hasCovers" as const,
      title: song.title,
      coverCount: song._count.covers
    };
  }

  await db.song.delete({
    where: { id }
  });

  return {
    ok: true as const,
    title: song.title
  };
}

export async function deleteAdminArtistIfUnused(id: string) {
  const artist = await db.artist.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          songs: true
        }
      }
    }
  });

  if (!artist) {
    return { ok: false as const, reason: "notFound" as const };
  }

  if (artist._count.songs > 0) {
    return {
      ok: false as const,
      reason: "hasSongs" as const,
      name: artist.name,
      songCount: artist._count.songs
    };
  }

  await db.artist.delete({
    where: { id }
  });

  return {
    ok: true as const,
    name: artist.name
  };
}