import { ContentStatus, CoverType, Prisma } from "@prisma/client";

import type { BasketItem } from "@/lib/basket/types";
import { resolveBasketItems } from "@/lib/data/basket";
import { shuffleItems } from "@/lib/data/covers";
import { db } from "@/lib/db";
import { escapeLikePattern } from "@/lib/utils";

export const PLAYLIST_DEFAULT_COUNT = 10;
// 「これを再生」は watch_videos（lib/basket/takeaway.ts）に渡すため、その上限に合わせる。
export const PLAYLIST_MAX_COUNT = 50;
export const PLAYLIST_MAX_ARTISTS = 10;

export type PlaylistConditions = {
  count: number;
  // YYYY-MM-DD。performedAt（動画の公開日）の範囲。
  dateFrom?: string;
  dateTo?: string;
  // 原曲アーティスト名。いずれかに部分一致すれば対象（OR）。
  artists: string[];
  // 同じ楽曲の別の歌唱記録を1つのリストに入れてよいか。
  allowDuplicateSongs: boolean;
};

export type PlaylistTrack = BasketItem & {
  artistNames: string;
  performedAt: Date;
};

export type RandomPlaylist = {
  tracks: PlaylistTrack[];
  // 条件に合う候補の数（重複除外前の動画数）。指定曲数に届かなかったときの説明に使う。
  candidateCount: number;
};

function parseDate(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// 登録済みの歌唱記録からランダムにプレイリストを作る。
//
// 対象は「1本の動画 = 1曲」の歌ってみた動画（COVER_VIDEO）だけ。歌枠・ライブ・メドレー・
// ショート・その他は、通して聴くと別の曲や雑談が混ざる・短すぎるため除外する。
// COVER_VIDEO でも同じ動画に別の曲が複数登録されているもの（実質メドレー）は除く。
export async function generateRandomPlaylist(conditions: PlaylistConditions): Promise<RandomPlaylist> {
  const and: Prisma.CoverWhereInput[] = [
    { status: ContentStatus.APPROVED },
    { coverType: CoverType.COVER_VIDEO },
    { sourceVideoId: { not: null } }
  ];

  const dateFrom = parseDate(conditions.dateFrom, false);
  const dateTo = parseDate(conditions.dateTo, true);
  if (dateFrom || dateTo) {
    and.push({
      performedAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {})
      }
    });
  }

  if (conditions.artists.length > 0) {
    and.push({
      song: {
        artists: {
          some: {
            OR: conditions.artists.map((name) => ({
              artist: {
                name: { contains: escapeLikePattern(name), mode: Prisma.QueryMode.insensitive }
              }
            }))
          }
        }
      }
    });
  }

  // 候補は ID と抽選に要る列だけを全件取る。件数が多くても軽い列だけなので、
  // ORDER BY random() を生 SQL で書くより where の組み立てを共有できる方を選ぶ。
  //
  // 「別の曲が複数紐づく動画」は絞り込み前の全件で判定する。アーティスト等で絞った後に
  // 数えると、同じ動画の他の曲が条件から外れて1曲だけに見えてしまうため。
  const [candidates, multiSongVideos] = await Promise.all([
    db.cover.findMany({
      where: { AND: and },
      select: { id: true, songId: true, sourceVideoId: true }
    }),
    db.$queryRaw<{ sourceVideoId: string }[]>`
      SELECT "sourceVideoId"
      FROM "covers"
      WHERE "status" = 'APPROVED' AND "sourceVideoId" IS NOT NULL
      GROUP BY "sourceVideoId"
      HAVING COUNT(DISTINCT "songId") > 1
    `
  ]);

  const excludedVideos = new Set(multiSongVideos.map((row) => row.sourceVideoId));

  // 動画ごとにまとめる。同じ曲が重複登録されているだけなら、そのうち1件を代表にする。
  const byVideo = new Map<string, { ids: string[]; songId: string }>();
  for (const candidate of candidates) {
    const key = candidate.sourceVideoId as string;
    if (excludedVideos.has(key)) {
      continue;
    }
    const group = byVideo.get(key) ?? { ids: [], songId: candidate.songId };
    group.ids.push(candidate.id);
    byVideo.set(key, group);
  }

  const pool = Array.from(byVideo.values()).map((group) => ({
    id: group.ids[Math.floor(Math.random() * group.ids.length)],
    songId: group.songId
  }));

  const picked: string[] = [];
  const usedSongs = new Set<string>();
  for (const entry of shuffleItems(pool)) {
    if (picked.length >= conditions.count) {
      break;
    }
    if (!conditions.allowDuplicateSongs) {
      if (usedSongs.has(entry.songId)) {
        continue;
      }
      usedSongs.add(entry.songId);
    }
    picked.push(entry.id);
  }

  if (picked.length === 0) {
    return { tracks: [], candidateCount: pool.length };
  }

  const [items, extras] = await Promise.all([
    resolveBasketItems(picked),
    db.cover.findMany({
      where: { id: { in: picked } },
      select: {
        id: true,
        performedAt: true,
        song: { select: { artists: { select: { artist: { select: { name: true } } } } } }
      }
    })
  ]);

  const extraById = new Map(extras.map((extra) => [extra.id, extra]));

  const tracks = items.flatMap((item) => {
    const extra = extraById.get(item.id);
    if (!extra) {
      return [];
    }
    return [
      {
        ...item,
        artistNames: extra.song.artists.map(({ artist }) => artist.name).join(", "),
        performedAt: extra.performedAt
      }
    ];
  });

  return { tracks, candidateCount: pool.length };
}
