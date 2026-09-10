import { ContentStatus, Prisma } from "@prisma/client";

import { coverListInclude } from "@/lib/data/covers";
import { db } from "@/lib/db";
import { escapeLikePattern } from "@/lib/utils";
import type { FeatureInput, FeatureItemInput } from "@/lib/validations/feature";

// 編集画面で使う、items を position 順・cover 情報込みで読んだ特集1件。
export const featureAdminInclude = {
  items: {
    orderBy: { position: "asc" },
    include: {
      cover: {
        include: coverListInclude
      }
    }
  }
} satisfies Prisma.FeatureInclude;

export type FeatureAdminDetail = Prisma.FeatureGetPayload<{
  include: typeof featureAdminInclude;
}>;

export async function listFeaturesForAdmin() {
  return db.feature.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { items: true } }
    }
  });
}

export async function getFeatureForAdmin(id: string): Promise<FeatureAdminDetail | null> {
  return db.feature.findUnique({
    where: { id },
    include: featureAdminInclude
  });
}

// 入力の items から、同じ coverId の重複を先勝ちで除き、position を添字で振り直す。
// @@unique([featureId, coverId]) 違反を保存前に防ぐ。
function normalizeItems(items: FeatureItemInput[]) {
  const seen = new Set<string>();
  const deduped: FeatureItemInput[] = [];

  for (const item of items) {
    if (seen.has(item.coverId)) {
      continue;
    }
    seen.add(item.coverId);
    deduped.push(item);
  }

  return deduped.map((item, index) => ({
    coverId: item.coverId,
    comment: item.comment,
    position: index
  }));
}

export async function createFeature(input: FeatureInput) {
  const items = normalizeItems(input.items);

  return db.feature.create({
    data: {
      slug: input.slug,
      title: input.title,
      lead: input.lead,
      outro: input.outro ?? null,
      links: input.links as Prisma.InputJsonValue,
      items: {
        create: items
      }
    }
  });
}

export async function updateFeature(id: string, input: FeatureInput) {
  const items = normalizeItems(input.items);

  // FeatureItem は毎回全削除して再作成する（1記事あたり数件のため単純さを優先）。
  return db.$transaction(async (client) => {
    await client.feature.update({
      where: { id },
      data: {
        slug: input.slug,
        title: input.title,
        lead: input.lead,
        outro: input.outro ?? null,
        links: input.links as Prisma.InputJsonValue
      }
    });

    await client.featureItem.deleteMany({ where: { featureId: id } });

    await client.featureItem.createMany({
      data: items.map((item) => ({ ...item, featureId: id }))
    });

    return client.feature.findUniqueOrThrow({
      where: { id },
      include: featureAdminInclude
    });
  });
}

export async function deleteFeature(id: string) {
  // FeatureItem は onDelete: Cascade なので特集を消せば紐づく item も消える。
  return db.feature.delete({ where: { id } });
}

// status と publishedAt を同時に更新する。初回公開時のみ publishedAt を打刻し、
// 一度公開した記事を再公開しても最初の公開日を保つ。
export async function publishFeature(id: string) {
  const feature = await db.feature.findUnique({
    where: { id },
    select: { publishedAt: true }
  });

  if (!feature) {
    return null;
  }

  return db.feature.update({
    where: { id },
    data: {
      status: ContentStatus.APPROVED,
      publishedAt: feature.publishedAt ?? new Date()
    }
  });
}

export async function unpublishFeature(id: string) {
  return db.feature.update({
    where: { id },
    data: {
      status: ContentStatus.PENDING,
      publishedAt: null
    }
  });
}

// 一覧・トップの棚・記事ページで共通の、公開特集を読む include。
// 先頭1件の cover はサムネイル（OGP・カード）に使う。
export const featurePublicInclude = {
  _count: { select: { items: true } },
  items: {
    orderBy: { position: "asc" },
    include: {
      cover: {
        include: coverListInclude
      }
    }
  }
} satisfies Prisma.FeatureInclude;

export type FeaturePublicDetail = Prisma.FeatureGetPayload<{
  include: typeof featurePublicInclude;
}>;

// 一覧・トップの棚用の軽量版（先頭1件の cover だけ持つ）。
export const featureCardInclude = {
  _count: { select: { items: true } },
  items: {
    orderBy: { position: "asc" },
    take: 1,
    include: {
      cover: {
        include: coverListInclude
      }
    }
  }
} satisfies Prisma.FeatureInclude;

export type FeatureCard = Prisma.FeatureGetPayload<{
  include: typeof featureCardInclude;
}>;

export async function listPublishedFeatures(): Promise<FeatureCard[]> {
  return db.feature.findMany({
    where: { status: ContentStatus.APPROVED },
    orderBy: [{ publishedAt: "desc" }],
    include: featureCardInclude
  });
}

// トップの「スタッフのおすすめ」棚。公開済みの最新 take 本。
export async function getLatestPublishedFeatures(take = 3): Promise<FeatureCard[]> {
  return db.feature.findMany({
    where: { status: ContentStatus.APPROVED },
    orderBy: [{ publishedAt: "desc" }],
    take,
    include: featureCardInclude
  });
}

// 公開記事の本体。未公開（PENDING 等）や存在しない slug は null を返し、ページ側で 404 にする。
export async function getPublishedFeatureBySlug(slug: string): Promise<FeaturePublicDetail | null> {
  return db.feature.findFirst({
    where: { slug, status: ContentStatus.APPROVED },
    include: featurePublicInclude
  });
}

export type FeatureLinkRef = { slug: string; title: string };

// この歌唱記録を紹介している公開特集。/covers/[id] の内部リンク用。
export async function getFeaturesForCover(coverId: string): Promise<FeatureLinkRef[]> {
  return db.feature.findMany({
    where: {
      status: ContentStatus.APPROVED,
      items: { some: { coverId } }
    },
    orderBy: [{ publishedAt: "desc" }],
    select: { slug: true, title: true }
  });
}

// この楽曲の歌唱記録が1件でも登場する公開特集。/songs/[id] 用。
export async function getFeaturesForSong(songId: string): Promise<FeatureLinkRef[]> {
  return db.feature.findMany({
    where: {
      status: ContentStatus.APPROVED,
      items: { some: { cover: { songId } } }
    },
    orderBy: [{ publishedAt: "desc" }],
    select: { slug: true, title: true }
  });
}

// この活動者の歌唱記録が登場する公開特集。/performers/[id] 用。
export async function getFeaturesForPerformer(performerId: string): Promise<FeatureLinkRef[]> {
  return db.feature.findMany({
    where: {
      status: ContentStatus.APPROVED,
      items: { some: { cover: { performers: { some: { performerId } } } } }
    },
    orderBy: [{ publishedAt: "desc" }],
    select: { slug: true, title: true }
  });
}

// sitemap 用。公開済み特集の slug と更新日時。
export async function getPublishedFeatureSitemapEntries() {
  return db.feature.findMany({
    where: { status: ContentStatus.APPROVED },
    select: { slug: true, updatedAt: true }
  });
}

export type CoverPickerResult = {
  id: string;
  songTitle: string;
  artistNames: string;
  performerNames: string;
  performedAt: string;
};

// 曲選択UI用の歌唱記録検索。楽曲名・活動者名・原曲アーティスト名のいずれかに一致する
// 承認済み記録を返す。同じ曲の別歌唱を取り違えないよう、歌唱者名と配信日を必ず含める。
export async function searchApprovedCoversForPicker(
  query: string,
  limit = 20
): Promise<CoverPickerResult[]> {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const contains = { contains: escapeLikePattern(trimmed), mode: Prisma.QueryMode.insensitive };

  const covers = await db.cover.findMany({
    where: {
      status: ContentStatus.APPROVED,
      OR: [
        { song: { title: contains } },
        {
          performers: {
            some: {
              performer: {
                OR: [{ name: contains }, { aliases: { some: { alias: contains } } }]
              }
            }
          }
        },
        { song: { artists: { some: { artist: { name: contains } } } } }
      ]
    },
    include: coverListInclude,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    take: limit
  });

  return covers.map((cover) => ({
    id: cover.id,
    songTitle: cover.song.title,
    artistNames: cover.song.artists.map(({ artist }) => artist.name).join(", "),
    performerNames: cover.performers.map(({ performer }) => performer.name).join(", "),
    performedAt: cover.performedAt.toISOString().slice(0, 10)
  }));
}
