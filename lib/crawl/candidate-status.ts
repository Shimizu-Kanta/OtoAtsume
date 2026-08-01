import { CoverCandidateStatus, Prisma, PrismaClient } from "@prisma/client";

import { extractYouTubeVideoId } from "@/lib/youtube";

type DbClient = PrismaClient | Prisma.TransactionClient;

// Cover が作成されたら、対応する PENDING 候補を ADOPTED にする（登録実績からの自動完了判定）。
// videoId で突合するため URL の表記揺れ（youtu.be・&t= 付き等）の影響を受けない。
// Cover 作成と同一トランザクション内で呼ぶこと。
export async function syncCandidateStatusForVideo(
  client: DbClient,
  sourceUrl: string,
  createdCoverId?: string
) {
  const videoId = extractYouTubeVideoId(sourceUrl);
  if (!videoId) {
    return;
  }

  const candidate = await client.coverCandidate.findUnique({ where: { videoId } });

  // PENDING のときだけ更新する。REJECTED（管理者が意図的に除外した判断）は覆さない。
  if (!candidate || candidate.status !== CoverCandidateStatus.PENDING) {
    return;
  }

  await client.coverCandidate.update({
    where: { videoId },
    data: {
      status: CoverCandidateStatus.ADOPTED,
      adoptedCoverId: candidate.adoptedCoverId ?? createdCoverId ?? null
    }
  });
}

// 候補一覧で「この動画から何件登録されたか」を表示するため、videoId ごとの Cover 件数を
// まとめて集計する（N+1 回避）。sourceVideoId カラムで高速に groupBy する。
export async function countCoversByVideoIds(
  client: DbClient,
  videoIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (videoIds.length === 0) {
    return result;
  }

  const grouped = await client.cover.groupBy({
    by: ["sourceVideoId"],
    where: { sourceVideoId: { in: videoIds } },
    _count: { _all: true }
  });

  for (const row of grouped) {
    if (row.sourceVideoId) {
      result.set(row.sourceVideoId, row._count._all);
    }
  }

  return result;
}
