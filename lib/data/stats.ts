import { ContentStatus, MasterDataStatus, ReportStatus } from "@prisma/client";

import { summarizeYearlyCounts } from "@/lib/content-summary";
import { db } from "@/lib/db";

export async function getPublicStats() {
  const [coverCount, performerCount, songCount] = await Promise.all([
    db.cover.count({ where: { status: ContentStatus.APPROVED } }),
    db.performer.count({ where: { status: "APPROVED" } }),
    db.song.count()
  ]);

  return { coverCount, performerCount, songCount };
}

// /stats ページ用のデータベース統計。すべて公開（APPROVED）レコードのみを集計する。
export async function getSiteStats() {
  const [coverCount, songCount, performerCount, artistCount, typeGroups, covers, recentCovers] =
    await Promise.all([
      db.cover.count({ where: { status: ContentStatus.APPROVED } }),
      db.song.count(),
      db.performer.count({ where: { status: MasterDataStatus.APPROVED } }),
      db.artist.count(),
      db.cover.groupBy({
        by: ["coverType"],
        where: { status: ContentStatus.APPROVED },
        _count: { coverType: true }
      }),
      db.cover.findMany({
        where: { status: ContentStatus.APPROVED },
        select: { performedAt: true }
      }),
      db.cover.findMany({
        where: {
          status: ContentStatus.APPROVED,
          createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        },
        select: { createdAt: true }
      })
    ]);

  const coverTypeBreakdown = typeGroups
    .map((group) => ({ type: group.coverType, count: group._count.coverType }))
    .sort((a, b) => b.count - a.count);

  const yearlyBreakdown = summarizeYearlyCounts(covers.map((cover) => cover.performedAt));
  const monthlyRegistrations = buildMonthlyRegistrations(recentCovers.map((cover) => cover.createdAt));

  return {
    totals: { coverCount, songCount, performerCount, artistCount },
    coverTypeBreakdown,
    yearlyBreakdown,
    monthlyRegistrations
  };
}

// 直近12ヶ月の月別新規登録数（登録がない月も0件として並べる）。
function buildMonthlyRegistrations(dates: Date[]) {
  const now = new Date();
  const buckets: { label: string; year: number; month: number; count: number }[] = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    buckets.push({
      label: `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`,
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      count: 0
    });
  }

  for (const date of dates) {
    const bucket = buckets.find(
      (item) => item.year === date.getUTCFullYear() && item.month === date.getUTCMonth()
    );
    if (bucket) {
      bucket.count += 1;
    }
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}

export async function getAdminDashboardStats() {
  const [pendingReportCount, pendingPerformerCount, latestCovers] = await Promise.all([
    db.report.count({ where: { status: ReportStatus.PENDING } }),
    db.performer.count({ where: { status: MasterDataStatus.PENDING } }),
    db.cover.findMany({
      include: {
        song: true,
        performers: {
          include: {
            performer: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  return { pendingReportCount, pendingPerformerCount, latestCovers };
}
