import { Prisma, type PrismaClient } from "@prisma/client";

import { pageSkip, paginate } from "@/lib/pagination";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function listTags() {
  const { db } = await import("@/lib/db");
  return db.tag.findMany({
    orderBy: { name: "asc" }
  });
}

export async function listAdminTags(page = 1, perPage = 50) {
  const { db } = await import("@/lib/db");

  const [items, totalCount] = await Promise.all([
    db.tag.findMany({
      include: {
        _count: {
          select: { performers: true }
        }
      },
      orderBy: { name: "asc" },
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.tag.count()
  ]);

  return paginate(items, totalCount, page, perPage);
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
      groups: { select: { tagGroupId: true } },
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

// ── タグ⇔グループの割り当て（タグ詳細画面から編集） ──────────────

export async function setTagGroups(tagId: string, groupIds: string[]) {
  const { db } = await import("@/lib/db");
  const uniqueGroupIds = Array.from(new Set(groupIds));

  await db.$transaction([
    db.tagGroupTag.deleteMany({ where: { tagId } }),
    ...(uniqueGroupIds.length > 0
      ? [
          db.tagGroupTag.createMany({
            data: uniqueGroupIds.map((tagGroupId) => ({ tagGroupId, tagId })),
            skipDuplicates: true
          })
        ]
      : [])
  ]);
}

// ── タググループ管理 ────────────────────────────────────────────

export async function listAllTagGroups() {
  const { db } = await import("@/lib/db");
  return db.tagGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
}

export async function listAdminTagGroups(page = 1, perPage = 50) {
  const { db } = await import("@/lib/db");

  const [items, totalCount] = await Promise.all([
    db.tagGroup.findMany({
      include: {
        _count: {
          select: { tags: true }
        }
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.tagGroup.count()
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function createAdminTagGroup(name: string, sortOrder = 0) {
  const { db } = await import("@/lib/db");
  return db.tagGroup.upsert({
    where: { name },
    create: { name, sortOrder },
    update: {}
  });
}

export async function updateAdminTagGroup(id: string, input: { name: string; sortOrder: number }) {
  const { db } = await import("@/lib/db");
  return db.tagGroup.update({
    where: { id },
    data: { name: input.name, sortOrder: input.sortOrder }
  });
}

// グループ削除は TagGroupTag が Cascade で消えるのみ。タグ自体は削除されない。
export async function deleteAdminTagGroup(id: string) {
  const { db } = await import("@/lib/db");

  const group = await db.tagGroup.findUnique({
    where: { id },
    select: { id: true, name: true }
  });

  if (!group) {
    return { ok: false as const, reason: "notFound" as const };
  }

  await db.tagGroup.delete({ where: { id } });

  return { ok: true as const, name: group.name };
}

export async function getAdminTagGroupWithTags(id: string) {
  const { db } = await import("@/lib/db");
  return db.tagGroup.findUnique({
    where: { id },
    include: {
      tags: {
        include: { tag: true },
        orderBy: { tag: { name: "asc" } }
      }
    }
  });
}

// このグループにまだ入っていないタグを、名前で検索する（追加候補として使う）
export async function searchAddableTagsForGroup(tagGroupId: string, query: string, limit = 10) {
  const { db } = await import("@/lib/db");
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  return db.tag.findMany({
    where: {
      name: { contains: trimmed, mode: Prisma.QueryMode.insensitive },
      groups: { none: { tagGroupId } }
    },
    orderBy: { name: "asc" },
    take: limit
  });
}

export async function addTagToGroup(tagGroupId: string, tagId: string) {
  const { db } = await import("@/lib/db");
  await db.tagGroupTag.upsert({
    where: { tagGroupId_tagId: { tagGroupId, tagId } },
    create: { tagGroupId, tagId },
    update: {}
  });
}

export async function removeTagFromGroup(tagGroupId: string, tagId: string) {
  const { db } = await import("@/lib/db");
  // 既に外れている場合でもエラーにしない（別画面からの操作と競合しても冪等）
  await db.tagGroupTag.deleteMany({
    where: { tagGroupId, tagId }
  });
}

// ── 公開側のタグ絞り込み用（グループ別 + その他） ────────────────

export type TagFilterOption = { id: string; name: string };
export type TagFilterGroup = { id: string; name: string; tags: TagFilterOption[] };

export async function listTagsGroupedForFilter(): Promise<{
  grouped: TagFilterGroup[];
  ungrouped: TagFilterOption[];
}> {
  const { db } = await import("@/lib/db");

  const [groups, tags] = await Promise.all([
    db.tagGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { tags: { select: { tagId: true } } }
    }),
    db.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  const grouped: TagFilterGroup[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    tags: group.tags
      .map((link) => tagById.get(link.tagId))
      .filter((tag): tag is TagFilterOption => Boolean(tag))
  }));

  const groupedTagIds = new Set(groups.flatMap((group) => group.tags.map((link) => link.tagId)));
  const ungrouped = tags.filter((tag) => !groupedTagIds.has(tag.id));

  return { grouped, ungrouped };
}