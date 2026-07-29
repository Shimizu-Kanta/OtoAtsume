import { CoverCandidateStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { pageSkip, paginate } from "@/lib/pagination";

export const coverCandidateInclude = {
  sourcePerformer: {
    select: { id: true, name: true, group: { select: { name: true } } }
  }
} satisfies Prisma.CoverCandidateInclude;

export type CoverCandidateItem = Prisma.CoverCandidateGetPayload<{
  include: typeof coverCandidateInclude;
}>;

export async function listCoverCandidates(
  status: CoverCandidateStatus,
  page = 1,
  perPage = 20
) {
  const where: Prisma.CoverCandidateWhereInput = { status };

  const [items, totalCount] = await Promise.all([
    db.coverCandidate.findMany({
      where,
      include: coverCandidateInclude,
      orderBy: { publishedAt: "desc" },
      skip: pageSkip(page, perPage),
      take: perPage
    }),
    db.coverCandidate.count({ where })
  ]);

  return paginate(items, totalCount, page, perPage);
}

export async function getCoverCandidate(id: string) {
  return db.coverCandidate.findUnique({
    where: { id },
    include: coverCandidateInclude
  });
}

export async function countPendingCoverCandidates() {
  return db.coverCandidate.count({ where: { status: CoverCandidateStatus.PENDING } });
}

export async function getCoverCandidateStatusCounts() {
  const grouped = await db.coverCandidate.groupBy({
    by: ["status"],
    _count: { status: true }
  });

  const counts: Record<CoverCandidateStatus, number> = {
    PENDING: 0,
    ADOPTED: 0,
    REJECTED: 0
  };

  for (const row of grouped) {
    counts[row.status] = row._count.status;
  }

  return counts;
}

export async function setCoverCandidateStatus(id: string, status: CoverCandidateStatus) {
  return db.coverCandidate.update({
    where: { id },
    data: { status }
  });
}

export async function markCoverCandidateAdopted(id: string, adoptedCoverId: string) {
  return db.coverCandidate.update({
    where: { id },
    data: { status: CoverCandidateStatus.ADOPTED, adoptedCoverId }
  });
}
