import { ContentStatus, MasterDataStatus, ReportStatus } from "@prisma/client";

import { db } from "@/lib/db";

export async function getPublicStats() {
  const [coverCount, performerCount, songCount] = await Promise.all([
    db.cover.count({ where: { status: ContentStatus.APPROVED } }),
    db.performer.count({ where: { status: "APPROVED" } }),
    db.song.count()
  ]);

  return { coverCount, performerCount, songCount };
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
