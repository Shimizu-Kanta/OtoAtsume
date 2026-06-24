import {
  ApplicationStatus,
  ContentStatus,
  CoverType,
  MasterDataStatus,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();

function normalizeAdminEmails(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function upsertSong(title: string, artistNames: string[], originalUrl?: string) {
  const existing = await prisma.song.findFirst({
    where: { title: { equals: title, mode: "insensitive" } }
  });

  const song =
    existing ??
    (await prisma.song.create({
      data: {
        title,
        originalUrl
      }
    }));

  for (const name of artistNames) {
    const artist = await prisma.artist.upsert({
      where: { name },
      create: { name },
      update: {}
    });

    await prisma.songArtist.upsert({
      where: { songId_artistId: { songId: song.id, artistId: artist.id } },
      create: { songId: song.id, artistId: artist.id },
      update: {}
    });
  }

  return song;
}

async function main() {
  const groupNames = ["ホロライブ", "にじさんじ", "個人勢"];
  const groups = await Promise.all(
    groupNames.map((name) =>
      prisma.group.upsert({
        where: { name },
        create: { name },
        update: {}
      })
    )
  );

  for (const name of ["YOASOBI", "Ado", "Vaundy"]) {
    await prisma.artist.upsert({
      where: { name },
      create: { name },
      update: {}
    });
  }

  const idol = await upsertSong("アイドル", ["YOASOBI"]);
  const ussee = await upsertSong("うっせぇわ", ["Ado"]);
  const kaiju = await upsertSong("怪獣の花唄", ["Vaundy"]);

  const performerSeeds = [
    {
      name: "開発用シンガーA",
      alias: "シンガーA",
      groupId: groups[0].id,
      youtubeUrl: "https://example.com/dev/singer-a"
    },
    {
      name: "開発用シンガーB",
      alias: "シンガーB",
      groupId: groups[1].id,
      youtubeUrl: "https://example.com/dev/singer-b"
    },
    {
      name: "開発用シンガーC",
      alias: "シンガーC",
      groupId: groups[2].id,
      youtubeUrl: "https://example.com/dev/singer-c"
    }
  ];

  const performers: { id: string }[] = [];
  for (const seed of performerSeeds) {
    const existing = await prisma.performer.findFirst({
      where: { name: seed.name }
    });
    const performer =
      existing ??
      (await prisma.performer.create({
        data: {
          name: seed.name,
          groupId: seed.groupId,
          youtubeUrl: seed.youtubeUrl,
          status: MasterDataStatus.APPROVED,
          aliases: { create: { alias: seed.alias } }
        }
      }));
    performers.push(performer);
  }

  const coverSeeds = [
    {
      songId: idol.id,
      performerId: performers[0].id,
      performedAt: new Date("2025-01-15T00:00:00.000Z"),
      coverType: CoverType.COVER_VIDEO,
      sourceUrl: "https://example.com/dev/cover-idol",
      sourceTitle: "開発用カバー動画",
      timestampSeconds: 0
    },
    {
      songId: ussee.id,
      performerId: performers[1].id,
      performedAt: new Date("2025-02-20T00:00:00.000Z"),
      coverType: CoverType.KARAOKE_STREAM,
      sourceUrl: "https://example.com/dev/karaoke-stream",
      sourceTitle: "開発用歌枠",
      timestampSeconds: 630
    },
    {
      songId: kaiju.id,
      performerId: performers[2].id,
      performedAt: new Date("2025-03-05T00:00:00.000Z"),
      coverType: CoverType.LIVE_EVENT,
      sourceUrl: "https://example.com/dev/paid-live-setlist",
      sourceTitle: "開発用セットリスト",
      timestampSeconds: null
    }
  ];

  for (const seed of coverSeeds) {
    const existing = await prisma.cover.findFirst({
      where: {
        songId: seed.songId,
        sourceUrl: seed.sourceUrl,
        performedAt: seed.performedAt,
        timestampSeconds: seed.timestampSeconds
      }
    });

    if (existing) {
      continue;
    }

    await prisma.cover.create({
      data: {
        songId: seed.songId,
        performedAt: seed.performedAt,
        coverType: seed.coverType,
        sourceUrl: seed.sourceUrl,
        sourceTitle: seed.sourceTitle,
        timestampSeconds: seed.timestampSeconds,
        status: ContentStatus.APPROVED,
        performers: {
          create: { performerId: seed.performerId }
        }
      }
    });
  }

  const existingApplication = await prisma.performerApplication.findFirst({
    where: { name: "開発用申請者", url: "https://example.com/dev/application" }
  });

  if (!existingApplication) {
    await prisma.performerApplication.create({
      data: {
        name: "開発用申請者",
        url: "https://example.com/dev/application",
        groupId: groups[2].id,
        memo: "管理画面確認用のダミー申請です。",
        status: ApplicationStatus.PENDING
      }
    });
  }

  for (const email of normalizeAdminEmails(process.env.ADMIN_ALLOWED_EMAILS)) {
    await prisma.adminUser.upsert({
      where: { email },
      create: { email },
      update: {}
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
