import {
  ApplicationStatus,
  ContentStatus,
  MasterDataStatus,
  Prisma,
  ReportStatus
} from "@prisma/client";

import { db } from "@/lib/db";
import { coverDetailInclude, coverListInclude } from "@/lib/data/covers";
import { replacePerformerTags } from "@/lib/data/tags";
import { normalizeNames } from "@/lib/utils";

export async function listReports(status?: ReportStatus) {
  return db.report.findMany({
    where: status ? { status } : {},
    include: {
      cover: {
        include: coverListInclude
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
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

export async function listPerformerApplications(status?: ApplicationStatus) {
  return db.performerApplication.findMany({
    where: status ? { status } : {},
    include: { group: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function getPerformerApplication(id: string) {
  return db.performerApplication.findUnique({
    where: { id },
    include: { group: true }
  });
}

export async function updatePerformerApplicationStatus(id: string, status: ApplicationStatus) {
  return db.performerApplication.update({
    where: { id },
    data: { status }
  });
}

export async function approvePerformerApplication(id: string) {
  return db.$transaction(async (client) => {
    const application = await client.performerApplication.findUniqueOrThrow({
      where: { id }
    });

    const existing = await client.performer.findFirst({
      where: {
        name: { equals: application.name, mode: Prisma.QueryMode.insensitive }
      }
    });

    const performer = existing
      ? await client.performer.update({
          where: { id: existing.id },
          data: {
            groupId: application.groupId,
            officialUrl: application.url,
            status: MasterDataStatus.APPROVED
          }
        })
      : await client.performer.create({
        data: {
          name: application.name,
          groupId: application.groupId,
          officialUrl: application.url,
          status: MasterDataStatus.APPROVED
        }
      });

    await client.performerApplication.update({
      where: { id },
      data: { status: ApplicationStatus.APPROVED }
    });

    return performer;
  });
}

export async function listGroups() {
  return db.group.findMany({
    orderBy: { name: "asc" }
  });
}

export async function listAdminGroups() {
  return db.group.findMany({
    include: {
      _count: {
        select: {
          performers: true,
          performerApplications: true
        }
      }
    },
    orderBy: { name: "asc" }
  });
}

export async function getAdminGroup(id: string) {
  return db.group.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          performers: true,
          performerApplications: true
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

export async function listAdminPerformers() {
  return db.performer.findMany({
    include: {
      group: true,
      aliases: true,
      tags: {
        include: { tag: true },
        orderBy: { tag: { name: "asc" } }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
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

export async function listAdminSongs() {
  return db.song.findMany({
    include: {
      artists: {
        include: { artist: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function getAdminSong(id: string) {
  return db.song.findUnique({
    where: { id },
    include: {
      artists: {
        include: { artist: true }
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

export async function listAdminArtists() {
  return db.artist.findMany({
    include: {
      _count: {
        select: { songs: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
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
