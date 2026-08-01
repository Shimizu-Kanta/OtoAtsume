import { CrawlKeywordKind } from "@prisma/client";

import { db } from "@/lib/db";

export type CrawlKeywordsByKind = {
  COVER_VIDEO: string[];
  KARAOKE_STREAM: string[];
  MEDLEY: string[];
  EXCLUDE: string[];
};

// 有効なキーワードを kind ごとにまとめて返す（巡回の判定で使う）。
export async function getCrawlKeywordsByKind(): Promise<CrawlKeywordsByKind> {
  const keywords = await db.crawlKeyword.findMany({
    where: { enabled: true },
    select: { keyword: true, kind: true }
  });

  const grouped: CrawlKeywordsByKind = {
    COVER_VIDEO: [],
    KARAOKE_STREAM: [],
    MEDLEY: [],
    EXCLUDE: []
  };

  for (const { keyword, kind } of keywords) {
    grouped[kind].push(keyword);
  }

  return grouped;
}

export async function listCrawlKeywords() {
  return db.crawlKeyword.findMany({
    orderBy: [{ kind: "asc" }, { keyword: "asc" }]
  });
}

export async function createCrawlKeyword(keyword: string, kind: CrawlKeywordKind) {
  return db.crawlKeyword.upsert({
    where: { keyword },
    create: { keyword, kind },
    update: { kind, enabled: true }
  });
}

export async function setCrawlKeywordEnabled(id: string, enabled: boolean) {
  return db.crawlKeyword.update({
    where: { id },
    data: { enabled }
  });
}

export async function deleteCrawlKeyword(id: string) {
  return db.crawlKeyword.delete({ where: { id } });
}
