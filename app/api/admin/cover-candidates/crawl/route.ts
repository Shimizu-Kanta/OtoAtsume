import { NextResponse } from "next/server";

import { runCoverCandidateCrawl, type CrawlMode } from "@/lib/crawl/cover-candidates";

export const dynamic = "force-dynamic";

// Cloud Scheduler から1日1回叩く想定。日次レポートAPIと同じ Bearer 認証。
// 専用の CRAWL_API_TOKEN があればそれを、無ければ日次レポート用トークンを共用する。
function isAuthorized(request: Request) {
  const token = process.env.CRAWL_API_TOKEN ?? process.env.DAILY_REPORT_API_TOKEN;

  if (!token) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    // ?mode=cover（既定）/ ?mode=karaoke
    const mode: CrawlMode = url.searchParams.get("mode") === "karaoke" ? "KARAOKE_STREAM" : "COVER_VIDEO";

    const result = await runCoverCandidateCrawl({ mode, dryRun });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Cover candidate crawl failed", error);
    return NextResponse.json({ error: "Failed to run cover candidate crawl" }, { status: 500 });
  }
}
