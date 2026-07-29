import { ContentStatus, CoverCandidateType, MasterDataStatus } from "@prisma/client";

import { getCrawlKeywordsByKind, type CrawlKeywordsByKind } from "@/lib/data/crawl-keywords";
import { db } from "@/lib/db";
import { extractYouTubeChannelRef } from "@/lib/youtube";
import {
  fetchPlaylistItems,
  resolveChannelById,
  resolveChannelByHandle,
  type PlaylistVideoItem
} from "@/lib/youtube/client";

// 収集を止める閾値。未処理(PENDING)候補がこの件数に達したら巡回を打ち切る。
// 管理者の確認コストが青天井にならないようにするための制御。
export const MAX_PENDING_CANDIDATES = 50;

// 1回の実行で巡回する活動者数の上限（暴走防止）
const MAX_PERFORMERS_PER_RUN = 100;

// アップロードプレイリストから取得する新着動画数（1ページ）
const PLAYLIST_PAGE_SIZE = 50;

export type CrawlOptions = {
  performerIds?: string[]; // 未指定なら全活動者（crawlEnabled = true）
  publishedAfter?: Date; // 未指定なら performer.lastCrawledAt を使う
  maxPendingCandidates?: number;
  dryRun?: boolean; // true なら DB に書き込まず、作成される候補数だけ数える
};

export type CrawlResult = {
  performersProcessed: number;
  scanned: number;
  created: number;
  currentPending: number;
  stoppedReason: "completed" | "pendingLimitReached" | null;
  dryRun: boolean;
};

// 判定順は 除外 → 歌枠 → 歌ってみた。
// 歌枠キーワードを先に見るのは「歌枠」タイトルに「歌ってみた」が混ざるケースがあるため。
export function classifyVideo(
  title: string,
  description: string,
  keywords: CrawlKeywordsByKind
): CoverCandidateType | null {
  const haystack = `${title} ${description}`.toLowerCase();

  if (keywords.EXCLUDE.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return null;
  }

  if (keywords.KARAOKE_STREAM.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return CoverCandidateType.KARAOKE_STREAM;
  }

  if (keywords.COVER_VIDEO.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return CoverCandidateType.COVER_VIDEO;
  }

  return null;
}

async function alreadyKnown(videoId: string): Promise<boolean> {
  const [existingCover, existingCandidate] = await Promise.all([
    // 既に Cover に同じ動画が登録済みか（sourceUrl の形式差を吸収するため videoId 部分一致で判定）
    db.cover.findFirst({ where: { sourceUrl: { contains: videoId } }, select: { id: true } }),
    // 既に候補化済みか（REJECTED を含む全ステータス）
    db.coverCandidate.findUnique({ where: { videoId }, select: { id: true } })
  ]);

  return Boolean(existingCover || existingCandidate);
}

export async function runCoverCandidateCrawl(options: CrawlOptions = {}): Promise<CrawlResult> {
  const dryRun = options.dryRun ?? false;
  const maxPending = options.maxPendingCandidates ?? MAX_PENDING_CANDIDATES;

  // 1. 現在のPENDING件数を確認。すでに上限なら即終了する
  const currentPending = await db.coverCandidate.count({ where: { status: "PENDING" } });
  if (currentPending >= maxPending) {
    return {
      performersProcessed: 0,
      scanned: 0,
      created: 0,
      currentPending,
      stoppedReason: "pendingLimitReached",
      dryRun
    };
  }

  // 2. 対象活動者を取得（crawlEnabled = true、status = APPROVED、lastCrawledAt が古い順）
  const performers = await db.performer.findMany({
    where: {
      status: MasterDataStatus.APPROVED,
      crawlEnabled: true,
      youtubeUrl: { not: null },
      ...(options.performerIds && options.performerIds.length > 0
        ? { id: { in: options.performerIds } }
        : {})
    },
    select: {
      id: true,
      youtubeUrl: true,
      youtubeChannelId: true,
      youtubeUploadsPlaylistId: true,
      lastCrawledAt: true
    },
    orderBy: { lastCrawledAt: { sort: "asc", nulls: "first" } },
    take: MAX_PERFORMERS_PER_RUN
  });

  const keywords = await getCrawlKeywordsByKind();

  let pendingCount = currentPending;
  let created = 0;
  let scanned = 0;
  let performersProcessed = 0;
  let stoppedReason: CrawlResult["stoppedReason"] = "completed";

  for (const performer of performers) {
    if (pendingCount >= maxPending) {
      stoppedReason = "pendingLimitReached";
      break;
    }

    // a. チャンネルID / アップロードプレイリストIDの解決（未解決なら）
    let uploadsPlaylistId = performer.youtubeUploadsPlaylistId;

    if (!uploadsPlaylistId) {
      const ref = extractYouTubeChannelRef(performer.youtubeUrl);
      if (!ref) {
        // チャンネルURLが解釈できない活動者は巡回対象にできないためスキップ
        continue;
      }

      try {
        const resolved =
          ref.kind === "handle"
            ? await resolveChannelByHandle(ref.handle)
            : await resolveChannelById(ref.channelId);
        uploadsPlaylistId = resolved.uploadsPlaylistId;

        if (!dryRun) {
          await db.performer.update({
            where: { id: performer.id },
            data: {
              youtubeChannelId: resolved.channelId,
              youtubeUploadsPlaylistId: resolved.uploadsPlaylistId
            }
          });
        }
      } catch (error) {
        console.error(`チャンネル解決に失敗: performerId=${performer.id}`, error);
        continue;
      }
    }

    // b. 新着動画取得
    let videos: PlaylistVideoItem[];
    try {
      videos = await fetchPlaylistItems(uploadsPlaylistId, PLAYLIST_PAGE_SIZE);
    } catch (error) {
      console.error(`プレイリスト取得に失敗: performerId=${performer.id}`, error);
      continue;
    }

    // c. publishedAfter（または lastCrawledAt）より新しい動画のみに絞る
    const since = options.publishedAfter ?? performer.lastCrawledAt ?? null;
    const newVideos = since
      ? videos.filter((video) => new Date(video.publishedAt) > since)
      : videos;

    // d. 各動画を判定・候補化
    let cutOff = false;
    for (const video of newVideos) {
      if (pendingCount >= maxPending) {
        cutOff = true;
        break;
      }

      scanned += 1;

      const detectedType = classifyVideo(video.title, video.description, keywords);
      if (!detectedType) {
        continue;
      }

      if (await alreadyKnown(video.videoId)) {
        continue;
      }

      created += 1;
      pendingCount += 1;

      if (!dryRun) {
        const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        await db.coverCandidate.create({
          data: {
            videoId: video.videoId,
            videoUrl,
            title: video.title,
            description: video.description,
            channelId: video.channelId,
            channelTitle: video.channelTitle,
            thumbnailUrl: video.thumbnailUrl,
            publishedAt: new Date(video.publishedAt),
            detectedType,
            sourcePerformerId: performer.id
          }
        });
      }
    }

    performersProcessed += 1;

    // e. 打ち切りで途中終了した場合、lastCrawledAt は更新しない（新着の取りこぼし防止）
    if (cutOff) {
      stoppedReason = "pendingLimitReached";
      break;
    }

    if (!dryRun) {
      await db.performer.update({
        where: { id: performer.id },
        data: { lastCrawledAt: new Date() }
      });
    }
  }

  return {
    performersProcessed,
    scanned,
    created,
    currentPending: pendingCount,
    stoppedReason,
    dryRun
  };
}
