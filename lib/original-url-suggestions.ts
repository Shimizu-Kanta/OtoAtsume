import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { searchYouTubeVideos, type OriginalUrlCandidate } from "@/lib/youtube/client";

// 1回のバッチで処理する件数の上限。
// search.list は1日100回の専用クォータのため、余裕を持った値にする。
// 本番で初めて動作確認する際は一時的に 5 程度に下げ、問題なければ 30 に戻すこと。
const DEFAULT_BATCH_LIMIT = 30;

export function parseOriginalUrlCandidates(value: Prisma.JsonValue | null): OriginalUrlCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is OriginalUrlCandidate =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).videoId === "string" &&
      typeof (item as Record<string, unknown>).title === "string" &&
      typeof (item as Record<string, unknown>).channelTitle === "string"
  );
}

export async function getSongsMissingOriginalUrlCandidates(limit = DEFAULT_BATCH_LIMIT) {
  return db.song.findMany({
    where: {
      originalUrl: null,
      originalUrlCandidatesFetchedAt: null
    },
    include: { artists: { include: { artist: true } } },
    take: limit,
    orderBy: { createdAt: "asc" }
  });
}

async function fetchAndSaveCandidates(songId: string, title: string, artistNames: string[]) {
  const query = [title, ...artistNames, "MV"].join(" ");
  const results = await searchYouTubeVideos(query, 3);

  const candidates: OriginalUrlCandidate[] = results.map((result) => ({
    videoId: result.videoId,
    title: result.title,
    channelTitle: result.channelTitle,
    thumbnailUrl: result.thumbnailUrl
  }));

  await db.song.update({
    where: { id: songId },
    data: {
      originalUrlCandidates: candidates as unknown as Prisma.InputJsonValue,
      originalUrlCandidatesFetchedAt: new Date()
    }
  });

  return candidates;
}

export async function runOriginalUrlCandidateBatch(limit = DEFAULT_BATCH_LIMIT) {
  const targets = await getSongsMissingOriginalUrlCandidates(limit);

  let succeeded = 0;
  let failed = 0;

  // 直列で呼ぶ（外部APIのクォータ・レート制限に配慮）。
  for (const song of targets) {
    try {
      await fetchAndSaveCandidates(
        song.id,
        song.title,
        song.artists.map((entry) => entry.artist.name)
      );
      succeeded += 1;
    } catch (error) {
      console.error(`原曲URL候補取得に失敗: songId=${song.id}`, error);
      failed += 1;
    }
  }

  return { processed: targets.length, succeeded, failed };
}

// 個別の再検索用（管理画面の「再検索」ボタンから呼ぶ。バッチの対象条件を無視して強制的に再取得する）
export async function refetchOriginalUrlCandidatesForSong(songId: string) {
  const song = await db.song.findUniqueOrThrow({
    where: { id: songId },
    include: { artists: { include: { artist: true } } }
  });

  return fetchAndSaveCandidates(
    song.id,
    song.title,
    song.artists.map((entry) => entry.artist.name)
  );
}

export async function adoptOriginalUrlCandidate(songId: string, videoId: string) {
  await db.song.update({
    where: { id: songId },
    data: {
      originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      originalUrlCandidates: Prisma.DbNull,
      originalUrlCandidatesFetchedAt: null
    }
  });
}

export async function dismissOriginalUrlCandidates(songId: string) {
  // 候補が全部ハズレだった場合、消しておくと一覧がすっきりする。
  // fetchedAt は残すことで、同じ楽曲を毎回のバッチ対象に含めない（再検索ボタンでのみ再取得させる）。
  await db.song.update({
    where: { id: songId },
    data: { originalUrlCandidates: Prisma.DbNull }
  });
}
