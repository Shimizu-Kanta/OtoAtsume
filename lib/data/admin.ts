import {
  ApplicationStatus,
  ContentStatus,
  MasterDataStatus,
  Prisma,
  ReportStatus
} from "@prisma/client";

import { db } from "@/lib/db";
import { coverDetailInclude, coverListInclude } from "@/lib/data/covers";

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

    const performer =
      existing ??
      (await client.performer.create({
        data: {
          name: application.name,
          groupId: application.groupId,
          officialUrl: application.url,
          status: MasterDataStatus.APPROVED
        }
      }));

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
    include: { group: true, aliases: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function getAdminPerformer(id: string) {
  return db.performer.findUnique({
    where: { id },
    include: { group: true, aliases: true }
  });
}

export async function createAdminPerformer(input: {
  name: string;
  groupId?: string;
  youtubeUrl?: string;
  officialUrl?: string;
  status?: MasterDataStatus;
}) {
  return db.performer.create({
    data: {
      name: input.name,
      groupId: input.groupId,
      youtubeUrl: input.youtubeUrl,
      officialUrl: input.officialUrl,
      status: input.status ?? MasterDataStatus.APPROVED
    }
  });
}

export async function updateAdminPerformer(
  id: string,
  input: Partial<{
    name: string;
    groupId: string | null;
    youtubeUrl: string | null;
    officialUrl: string | null;
    status: MasterDataStatus;
  }>
) {
  return db.performer.update({
    where: { id },
    data: {
      ...input,
      groupId: input.groupId === "" ? null : input.groupId
    }
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
  input: Partial<{ title: string; originalUrl: string | null }>
) {
  return db.song.update({
    where: { id },
    data: input
  });
}

export async function listAdminArtists() {
  return db.artist.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
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
