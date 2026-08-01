import { CoverCandidateType, MasterDataStatus, Prisma } from "@prisma/client";

import { getCrawlKeywordsByKind, type CrawlKeywordsByKind } from "@/lib/data/crawl-keywords";
import { db } from "@/lib/db";
import { extractYouTubeChannelRef } from "@/lib/youtube";
import {
  fetchPlaylistItems,
  fetchVideoDurations,
  resolveChannelById,
  resolveChannelByHandle,
  type PlaylistVideoItem
} from "@/lib/youtube/client";

// 収集を止める閾値。未処理(PENDING)候補がこの件数に達したら巡回を打ち切る。
// 管理者の確認コストが青天井にならないようにするための制御。
export const MAX_PENDING_CANDIDATES = 50;

// 1回の実行で巡回する活動者数の上限（暴走防止）
const MAX_PERFORMERS_PER_RUN = 100;

// 通常の定期巡回: 1ページで十分（前回巡回日以降の新着のみが対象のため）
const DEFAULT_MAX_PAGES = 1;

// 初回バックフィル / 期間を明示指定した手動実行: 多めに遡る（最大500件）
const BACKFILL_MAX_PAGES = 10;

// 動画長の判定閾値。管理画面から変更できるのが理想だが、まずは定数で運用する。
// coverMaxSeconds は10分ではなく15分（900秒）。10分だとメドレーやMV+トーク込みが弾かれるため。
const DEFAULT_SETTINGS = {
  shortMaxSeconds: 60, // これ未満は SHORT 扱い
  coverMaxSeconds: 900 // 15分。これを超えるものは歌ってみたではないと判断する
};

export type CrawlMode = "COVER_VIDEO" | "KARAOKE_STREAM";

export type CrawlOptions = {
  mode?: CrawlMode; // 既定は歌ってみた取得
  performerIds?: string[]; // 未指定なら全活動者（crawlEnabled = true）
  publishedAfter?: Date; // 未指定なら該当モードの前回巡回日を使う
  maxPendingCandidates?: number;
  dryRun?: boolean; // true なら DB に書き込まず、作成される候補数だけ数える
};

export type CrawlResult = {
  mode: CrawlMode;
  performerCount: number;
  scanned: number; // 走査した動画数
  created: number; // 追加した候補数
  skippedAlreadyKnown: number; // 既に Cover/CoverCandidate に存在していた数
  skippedNotMatched: number; // 除外・キーワード不一致
  skippedTooLong: number; // 動画長超過（COVER_VIDEO モードのみ）
  currentPending: number;
  stoppedReason: "completed" | "pendingLimitReached" | "performerLimitReached";
  effectivePeriod: { from: Date | null; to: Date };
  lastCrawledAt: Date | null; // 単一活動者巡回時の当該モードの前回巡回日時（メッセージ表示用）
  dryRun: boolean;
};

type ClassifyResult =
  | { result: "candidate"; detectedType: CoverCandidateType }
  | { result: "excluded" }
  | { result: "notMatched" }
  | { result: "tooLong" };

function getLastCrawledField(mode: CrawlMode): "lastCrawledCoverAt" | "lastCrawledKaraokeAt" {
  return mode === "COVER_VIDEO" ? "lastCrawledCoverAt" : "lastCrawledKaraokeAt";
}

// 除外判定はタイトルのみを対象にする（概要欄の定型文で全滅するのを防ぐ）。
// COVER_VIDEO モードは動画長も見る（短すぎ=SHORT、長すぎ=候補にしない）。
// KARAOKE_STREAM モードは長さを見ない（ライブ/配信は長さがまちまちのため）。
export function classifyVideo(
  mode: CrawlMode,
  title: string,
  description: string,
  durationSeconds: number | null,
  keywords: CrawlKeywordsByKind,
  settings = DEFAULT_SETTINGS
): ClassifyResult {
  const titleLower = title.toLowerCase();
  if (keywords.EXCLUDE.some((keyword) => titleLower.includes(keyword.toLowerCase()))) {
    return { result: "excluded" };
  }

  const haystack = `${title} ${description}`.toLowerCase();

  // メドレー判定は動画長の判定より前に置く（両モード共通）。
  // メドレーは20〜30分になることが多く、先に15分カットオフを適用すると取りこぼすため。
  if (keywords.MEDLEY.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return { result: "candidate", detectedType: CoverCandidateType.MEDLEY };
  }

  if (mode === "COVER_VIDEO") {
    if (!keywords.COVER_VIDEO.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return { result: "notMatched" };
    }

    // 長さが取れなかった場合は候補に含める（取りこぼすより人間が確認する方が良い）
    if (durationSeconds == null) {
      return { result: "candidate", detectedType: CoverCandidateType.COVER_VIDEO };
    }

    if (durationSeconds < settings.shortMaxSeconds) {
      return { result: "candidate", detectedType: CoverCandidateType.SHORT };
    }

    if (durationSeconds > settings.coverMaxSeconds) {
      return { result: "tooLong" };
    }

    return { result: "candidate", detectedType: CoverCandidateType.COVER_VIDEO };
  }

  // KARAOKE_STREAM モード: 歌枠キーワードのみ、長さは見ない
  if (!keywords.KARAOKE_STREAM.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return { result: "notMatched" };
  }

  return { result: "candidate", detectedType: CoverCandidateType.KARAOKE_STREAM };
}

async function alreadyKnown(videoId: string): Promise<boolean> {
  const [existingCover, existingCandidate] = await Promise.all([
    db.cover.findFirst({ where: { sourceUrl: { contains: videoId } }, select: { id: true } }),
    db.coverCandidate.findUnique({ where: { videoId }, select: { id: true } })
  ]);

  return Boolean(existingCover || existingCandidate);
}

// キーワード判定を通過した動画の長さを、キャッシュ優先で解決する。
// 未取得のIDのみ videos.list（50件ずつ）で取得し、YouTubeVideoMetadataCache に保存する。
async function resolveDurations(
  videos: PlaylistVideoItem[],
  dryRun: boolean
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (videos.length === 0) {
    return result;
  }

  const cached = await db.youTubeVideoMetadataCache.findMany({
    where: { videoId: { in: videos.map((video) => video.videoId) }, durationSeconds: { not: null } },
    select: { videoId: true, durationSeconds: true }
  });
  for (const row of cached) {
    if (row.durationSeconds != null) {
      result.set(row.videoId, row.durationSeconds);
    }
  }

  const missing = videos.filter((video) => !result.has(video.videoId));
  if (missing.length === 0) {
    return result;
  }

  const fetched = await fetchVideoDurations(missing.map((video) => video.videoId));
  const videoById = new Map(missing.map((video) => [video.videoId, video]));

  for (const [videoId, seconds] of fetched) {
    result.set(videoId, seconds);

    const video = videoById.get(videoId);
    if (!dryRun && video) {
      await db.youTubeVideoMetadataCache.upsert({
        where: { videoId },
        create: {
          videoId,
          canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          sourceTitle: video.title,
          description: video.description,
          publishedAt: new Date(video.publishedAt),
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          tags: [],
          durationSeconds: seconds
        },
        update: { durationSeconds: seconds }
      });
    }
  }

  return result;
}

export async function runCoverCandidateCrawl(options: CrawlOptions = {}): Promise<CrawlResult> {
  const mode: CrawlMode = options.mode ?? "COVER_VIDEO";
  const dryRun = options.dryRun ?? false;
  const maxPending = options.maxPendingCandidates ?? MAX_PENDING_CANDIDATES;
  const startedAt = new Date();
  const lastCrawledField = getLastCrawledField(mode);

  const baseResult: Omit<CrawlResult, "stoppedReason"> = {
    mode,
    performerCount: 0,
    scanned: 0,
    created: 0,
    skippedAlreadyKnown: 0,
    skippedNotMatched: 0,
    skippedTooLong: 0,
    currentPending: 0,
    effectivePeriod: { from: options.publishedAfter ?? null, to: startedAt },
    lastCrawledAt: null,
    dryRun
  };

  const currentPending = await db.coverCandidate.count({ where: { status: "PENDING" } });
  if (currentPending >= maxPending) {
    return { ...baseResult, currentPending, stoppedReason: "pendingLimitReached" };
  }

  const eligibleWhere: Prisma.PerformerWhereInput = {
    status: MasterDataStatus.APPROVED,
    crawlEnabled: true,
    youtubeUrl: { not: null },
    ...(options.performerIds && options.performerIds.length > 0
      ? { id: { in: options.performerIds } }
      : {})
  };

  const [performers, eligibleCount] = await Promise.all([
    db.performer.findMany({
      where: eligibleWhere,
      select: {
        id: true,
        youtubeUrl: true,
        youtubeChannelId: true,
        youtubeUploadsPlaylistId: true,
        lastCrawledCoverAt: true,
        lastCrawledKaraokeAt: true
      },
      orderBy: { [lastCrawledField]: { sort: "asc", nulls: "first" } },
      take: MAX_PERFORMERS_PER_RUN
    }),
    db.performer.count({ where: eligibleWhere })
  ]);

  const keywords = await getCrawlKeywordsByKind();

  let pendingCount = currentPending;
  let created = 0;
  let scanned = 0;
  let skippedAlreadyKnown = 0;
  let skippedNotMatched = 0;
  let skippedTooLong = 0;
  let performerCount = 0;
  let stoppedReason: CrawlResult["stoppedReason"] = "completed";

  const singleLastCrawledAt = performers.length === 1 ? performers[0][lastCrawledField] : null;
  const effectiveFrom = options.publishedAfter ?? null;

  for (const performer of performers) {
    if (pendingCount >= maxPending) {
      stoppedReason = "pendingLimitReached";
      break;
    }

    let uploadsPlaylistId = performer.youtubeUploadsPlaylistId;

    if (!uploadsPlaylistId) {
      const ref = extractYouTubeChannelRef(performer.youtubeUrl);
      if (!ref) {
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

    const since = options.publishedAfter ?? performer[lastCrawledField] ?? null;
    const maxPages =
      options.publishedAfter || performer[lastCrawledField] == null
        ? BACKFILL_MAX_PAGES
        : DEFAULT_MAX_PAGES;

    let videos: PlaylistVideoItem[];
    try {
      videos = await fetchPlaylistItems(uploadsPlaylistId, {
        maxPages,
        publishedAfter: since ?? undefined
      });
    } catch (error) {
      console.error(`プレイリスト取得に失敗: performerId=${performer.id}`, error);
      continue;
    }

    const newVideos = since
      ? videos.filter((video) => new Date(video.publishedAt) > since)
      : videos;

    // 1. キーワード判定（長さ未取得の状態）で候補になり得る動画を抽出する。
    const matched: PlaylistVideoItem[] = [];
    for (const video of newVideos) {
      scanned += 1;
      const pre = classifyVideo(mode, video.title, video.description, null, keywords);
      if (pre.result === "candidate") {
        matched.push(video);
      } else {
        skippedNotMatched += 1;
      }
    }

    // 2. キーワード判定を通過した動画のみ、長さを取得する（COVER_VIDEO モードのみ）。
    const durations =
      mode === "COVER_VIDEO" ? await resolveDurations(matched, dryRun) : new Map<string, number>();

    // 3. 長さも考慮して確定判定・候補化する。
    let cutOff = false;
    for (const video of matched) {
      if (pendingCount >= maxPending) {
        cutOff = true;
        break;
      }

      const durationSeconds = mode === "COVER_VIDEO" ? durations.get(video.videoId) ?? null : null;
      const classified = classifyVideo(mode, video.title, video.description, durationSeconds, keywords);

      if (classified.result === "tooLong") {
        skippedTooLong += 1;
        continue;
      }

      if (classified.result !== "candidate") {
        skippedNotMatched += 1;
        continue;
      }

      if (await alreadyKnown(video.videoId)) {
        skippedAlreadyKnown += 1;
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
            detectedType: classified.detectedType,
            sourcePerformerId: performer.id
          }
        });
      }
    }

    performerCount += 1;

    if (cutOff) {
      stoppedReason = "pendingLimitReached";
      break;
    }

    if (!dryRun) {
      await db.performer.update({
        where: { id: performer.id },
        data: { [lastCrawledField]: new Date() } as Prisma.PerformerUpdateInput
      });
    }
  }

  if (stoppedReason === "completed" && eligibleCount > performers.length) {
    stoppedReason = "performerLimitReached";
  }

  return {
    mode,
    performerCount,
    scanned,
    created,
    skippedAlreadyKnown,
    skippedNotMatched,
    skippedTooLong,
    currentPending: pendingCount,
    stoppedReason,
    effectivePeriod: { from: effectiveFrom, to: startedAt },
    lastCrawledAt: singleLastCrawledAt,
    dryRun
  };
}
