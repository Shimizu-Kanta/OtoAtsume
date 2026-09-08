import { ContentStatus } from "@prisma/client";

import type { BasketItem } from "@/lib/basket/types";
import { db } from "@/lib/db";
import { clampPerformerColor } from "@/lib/performer-color";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

// かごの ID 列を、表示と再生に必要な情報に解決する。
// 非公開・削除された記録は結果に含めない（呼び出し側がかごから取り除く）。
export async function resolveBasketItems(ids: string[]): Promise<BasketItem[]> {
  if (ids.length === 0) {
    return [];
  }

  const covers = await db.cover.findMany({
    where: { id: { in: ids }, status: ContentStatus.APPROVED },
    select: {
      id: true,
      sourceUrl: true,
      sourceVideoId: true,
      sourceTitle: true,
      sourceImageUrl: true,
      coverType: true,
      timestampSeconds: true,
      song: { select: { title: true } },
      performers: {
        select: { performer: { select: { name: true, colorCode: true } } }
      }
    }
  });

  if (covers.length === 0) {
    return [];
  }

  const videoIds = Array.from(
    new Set(covers.map((cover) => cover.sourceVideoId).filter((id): id is string => Boolean(id)))
  );

  // 終了時刻の材料。
  //  1. 同じ動画の「自分より後ろの曲」の開始時刻（歌枠の切り出しはこれで足りる）
  //  2. 最後の曲は動画の長さ（メタデータキャッシュ）
  const [siblings, metadata] = await Promise.all([
    videoIds.length > 0
      ? db.cover.findMany({
          where: {
            sourceVideoId: { in: videoIds },
            status: ContentStatus.APPROVED,
            timestampSeconds: { not: null }
          },
          select: { sourceVideoId: true, timestampSeconds: true }
        })
      : Promise.resolve([]),
    videoIds.length > 0
      ? db.youTubeVideoMetadataCache.findMany({
          where: { videoId: { in: videoIds } },
          select: { videoId: true, durationSeconds: true }
        })
      : Promise.resolve([])
  ]);

  // 動画ごとの開始時刻を昇順に持っておき、二分探索せず線形に次を探す
  // （1本の動画に紐づく曲数はセットリスト規模なので線形で十分）。
  const startsByVideo = new Map<string, number[]>();
  for (const sibling of siblings) {
    if (!sibling.sourceVideoId || sibling.timestampSeconds == null) {
      continue;
    }
    const list = startsByVideo.get(sibling.sourceVideoId) ?? [];
    list.push(sibling.timestampSeconds);
    startsByVideo.set(sibling.sourceVideoId, list);
  }
  for (const list of startsByVideo.values()) {
    list.sort((a, b) => a - b);
  }

  const durationByVideo = new Map(
    metadata.map((row) => [row.videoId, row.durationSeconds] as const)
  );

  const byId = new Map(covers.map((cover) => [cover.id, cover]));

  // 引数の順序（かごの並び）を保って返す。
  return ids.flatMap((id) => {
    const cover = byId.get(id);

    if (!cover) {
      return [];
    }

    const start = cover.timestampSeconds;
    let end: number | null = null;

    // タイムスタンプが無い記録は「動画まるごとが1曲」として扱い、区間を切らない。
    if (start != null && cover.sourceVideoId) {
      const starts = startsByVideo.get(cover.sourceVideoId) ?? [];
      const next = starts.find((value) => value > start);

      if (next != null) {
        end = next;
      } else {
        const duration = durationByVideo.get(cover.sourceVideoId);
        end = duration ?? null;
      }
    }

    const performers = cover.performers.map(({ performer }) => performer);

    return [
      {
        id: cover.id,
        songTitle: cover.song.title,
        performerNames: performers.map((performer) => performer.name).join(", "),
        performerColor:
          clampPerformerColor(performers.find((performer) => performer.colorCode)?.colorCode) ??
          null,
        sourceUrl: cover.sourceUrl,
        sourceVideoId: cover.sourceVideoId,
        sourceTitle: cover.sourceTitle,
        thumbnailUrl: cover.sourceImageUrl ?? getYouTubeThumbnailUrl(cover.sourceUrl),
        coverType: cover.coverType,
        startSeconds: start,
        endSeconds: end
      } satisfies BasketItem
    ];
  });
}

// 1本の配信に紐づく公開済みの歌唱記録 ID を、タイムスタンプ順に返す。
// アルバム（複数曲入りの一枚）をかごに入れると収録曲すべてが入るために使う。
export async function listCoverIdsBySourceVideoId(sourceVideoId: string): Promise<string[]> {
  const covers = await db.cover.findMany({
    where: { sourceVideoId, status: ContentStatus.APPROVED },
    select: { id: true },
    orderBy: [{ timestampSeconds: { sort: "asc", nulls: "last" } }, { performedAt: "asc" }]
  });

  return covers.map((cover) => cover.id);
}
