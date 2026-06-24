import { ContentStatus, ReportStatus, ApplicationStatus } from "@prisma/client";

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
  const [pendingReportCount, pendingApplicationCount, latestCovers] = await Promise.all([
    db.report.count({ where: { status: ReportStatus.PENDING } }),
    db.performerApplication.count({ where: { status: ApplicationStatus.PENDING } }),
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

  return { pendingReportCount, pendingApplicationCount, latestCovers };
}
