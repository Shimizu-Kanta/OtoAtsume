import { Prisma, type PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function listTags() {
  const { db } = await import("@/lib/db");
  return db.tag.findMany({
    orderBy: { name: "asc" }
  });
}

export async function listAdminTags() {
  const { db } = await import("@/lib/db");
  return db.tag.findMany({
    include: {
      _count: {
        select: { performers: true }
      }
    },
    orderBy: { name: "asc" }
  });
}

export async function createAdminTag(name: string) {
  const { db } = await import("@/lib/db");
  return db.tag.upsert({
    where: { name },
    create: { name },
    update: {}
  });
}

export async function updateAdminTag(id: string, name: string) {
  const { db } = await import("@/lib/db");
  return db.tag.update({
    where: { id },
    data: { name }
  });
}

async function ensureTags(client: DbClient, tagNames: string[]) {
  const tags = [];

  for (const name of tagNames) {
    tags.push(
      await client.tag.upsert({
        where: { name },
        create: { name },
        update: {}
      })
    );
  }

  return tags;
}

export async function addPerformerTags(
  client: DbClient,
  performerId: string,
  tagNames: string[]
) {
  const tags = await ensureTags(client, tagNames);

  if (tags.length === 0) {
    return;
  }

  await client.performerTag.createMany({
    data: tags.map((tag) => ({ performerId, tagId: tag.id })),
    skipDuplicates: true
  });
}

export async function replacePerformerTags(
  client: DbClient,
  performerId: string,
  tagNames: string[]
) {
  const tags = await ensureTags(client, tagNames);
  const tagIds = tags.map((tag) => tag.id);

  await client.performerTag.deleteMany({
    where: tagIds.length > 0 ? { performerId, tagId: { notIn: tagIds } } : { performerId }
  });

  if (tags.length === 0) {
    return;
  }

  await client.performerTag.createMany({
    data: tags.map((tag) => ({ performerId, tagId: tag.id })),
    skipDuplicates: true
  });
}

export async function getAdminTagWithPerformers(id: string) {
  const { db } = await import("@/lib/db");
  return db.tag.findUnique({
    where: { id },
    include: {
      performers: {
        include: {
          performer: {
            include: { group: true }
          }
        },
        orderBy: { performer: { name: "asc" } }
      }
    }
  });
}

// このタグがまだ付いていない活動者を、名前で検索する（追加候補として使う）
export async function searchAddablePerformersForTag(tagId: string, query: string, limit = 10) {
  const { db } = await import("@/lib/db");
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  return db.performer.findMany({
    where: {
      name: { contains: trimmed, mode: Prisma.QueryMode.insensitive },
      tags: { none: { tagId } }
    },
    include: { group: true },
    orderBy: { name: "asc" },
    take: limit
  });
}

export async function addTagToPerformer(tagId: string, performerId: string) {
  const { db } = await import("@/lib/db");
  await db.performerTag.upsert({
    where: { performerId_tagId: { performerId, tagId } },
    create: { performerId, tagId },
    update: {}
  });
}

export async function removeTagFromPerformer(tagId: string, performerId: string) {
  const { db } = await import("@/lib/db");
  // 既に外れている場合でもエラーにしない（別画面からの操作と競合しても冪等）
  await db.performerTag.deleteMany({
    where: { performerId, tagId }
  });
}

export async function deleteAdminTagIfUnused(id: string) {
  const { db } = await import("@/lib/db");

  const tag = await db.tag.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          performers: true
        }
      }
    }
  });

  if (!tag) {
    return { ok: false as const, reason: "notFound" as const };
  }

  if (tag._count.performers > 0) {
    return {
      ok: false as const,
      reason: "hasPerformers" as const,
      name: tag.name,
      performerCount: tag._count.performers
    };
  }

  await db.tag.delete({
    where: { id }
  });

  return {
    ok: true as const,
    name: tag.name
  };
}