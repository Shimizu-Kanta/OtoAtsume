import { ContentStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { findSimilarSongs } from "@/lib/data/songs";
import { recordSongRequest } from "@/lib/data/song-request-log";

const APPROVED = ContentStatus.APPROVED;
const MATCH_THRESHOLD = 0.6;

export type WatchlistCheckItemInput = {
  id: string;
  songName: string;
  artistName: string | null;
  songId: string | null;
  addedAt: Date;
  lastCheckedAt: Date | null;
};

export type WatchlistCheckResultItem = {
  id: string;
  matched: boolean;
  songId: string | null;
  newCoverCount: number;
  totalCoverCount: number;
};

export async function checkWatchlistItems(
  items: WatchlistCheckItemInput[],
  ipHash: string
): Promise<WatchlistCheckResultItem[]> {
  const results: WatchlistCheckResultItem[] = [];

  for (const item of items) {
    results.push(await checkWatchlistItem(item, ipHash));
  }

  return results;
}

async function checkWatchlistItem(
  item: WatchlistCheckItemInput,
  ipHash: string
): Promise<WatchlistCheckResultItem> {
  if (item.songId) {
    return countCoversSince(item.id, item.songId, effectiveSince(item));
  }

  const [match] = await findSimilarSongs(item.songName, MATCH_THRESHOLD, item.addedAt);

  if (match) {
    // 新規マッチ直後は「登録された時点からの新着」として全件を新着扱いにする。
    return countCoversSince(item.id, match.id, item.addedAt);
  }

  await recordSongRequest({
    songName: item.songName,
    artistName: item.artistName,
    ipHash
  });

  return { id: item.id, matched: false, songId: null, newCoverCount: 0, totalCoverCount: 0 };
}

// addedAt と lastCheckedAt がどちらも分かる場合は、より新しい方を新着判定の基準にする
// （前回チェック以降に増えた分だけを新着として数え、毎回全件を新着扱いにしないため）。
function effectiveSince(item: WatchlistCheckItemInput) {
  if (item.lastCheckedAt && item.lastCheckedAt > item.addedAt) {
    return item.lastCheckedAt;
  }
  return item.addedAt;
}

async function countCoversSince(
  itemId: string,
  songId: string,
  since: Date
): Promise<WatchlistCheckResultItem> {
  const [newCoverCount, totalCoverCount] = await Promise.all([
    db.cover.count({
      where: { songId, status: APPROVED, createdAt: { gt: since } }
    }),
    db.cover.count({
      where: { songId, status: APPROVED }
    })
  ]);

  return { id: itemId, matched: true, songId, newCoverCount, totalCoverCount };
}
