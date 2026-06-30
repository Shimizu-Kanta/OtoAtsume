import { MasterDataStatus, Prisma, ReportStatus } from "@prisma/client";

import { db } from "@/lib/db";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type DailySiteReportSummary = {
  date: string;
  accessCount: number;
  addedCoverCount: number;
  addedSongCount: number;
  pendingReportCount: number;
  pendingPerformerCount: number;
  errorCounts: Record<string, number>;
};

export async function createDailySiteReport(dateKey = getDefaultReportDateKey()) {
  const { dateForDb, start, end } = getUtcRangeForJstDate(dateKey);

  const [
    accessCount,
    addedCoverCount,
    addedSongCount,
    pendingReportCount,
    pendingPerformerCount,
    groupedErrors
  ] = await Promise.all([
    db.siteAccessLog.count({
      where: {
        createdAt: {
          gte: start,
          lt: end
        }
      }
    }),
    db.cover.count({
      where: {
        createdAt: {
          gte: start,
          lt: end
        }
      }
    }),
    db.song.count({
      where: {
        createdAt: {
          gte: start,
          lt: end
        }
      }
    }),
    db.report.count({
      where: {
        status: ReportStatus.PENDING
      }
    }),
    db.performer.count({
      where: {
        status: MasterDataStatus.PENDING
      }
    }),
    db.appErrorLog.groupBy({
      by: ["type"],
      where: {
        createdAt: {
          gte: start,
          lt: end
        }
      },
      _count: {
        _all: true
      }
    })
  ]);

  const errorCounts: Record<string, number> = {};

  for (const item of groupedErrors) {
    errorCounts[item.type] = item._count._all;
  }

  await db.dailySiteReport.upsert({
    where: {
      date: dateForDb
    },
    create: {
      date: dateForDb,
      accessCount,
      addedCoverCount,
      addedSongCount,
      pendingReportCount,
      pendingPerformerCount,
      errorCounts: errorCounts as Prisma.InputJsonObject
    },
    update: {
      accessCount,
      addedCoverCount,
      addedSongCount,
      pendingReportCount,
      pendingPerformerCount,
      errorCounts: errorCounts as Prisma.InputJsonObject
    }
  });

  return {
    date: dateKey,
    accessCount,
    addedCoverCount,
    addedSongCount,
    pendingReportCount,
    pendingPerformerCount,
    errorCounts
  } satisfies DailySiteReportSummary;
}

function getDefaultReportDateKey() {
  return getJstDateKey(new Date(), -1);
}

function getJstDateKey(base: Date, dayOffset = 0) {
  const jst = new Date(base.getTime() + JST_OFFSET_MS);
  jst.setUTCDate(jst.getUTCDate() + dayOffset);

  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getUtcRangeForJstDate(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("date must be YYYY-MM-DD format.");
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  const start = new Date(Date.UTC(year, month - 1, day) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month - 1, day + 1) - JST_OFFSET_MS);
  const dateForDb = new Date(Date.UTC(year, month - 1, day));

  return {
    dateForDb,
    start,
    end
  };
}

export async function listDailySiteReports(limit = 30) {
  return db.dailySiteReport.findMany({
    orderBy: {
      date: "desc"
    },
    take: limit
  });
}