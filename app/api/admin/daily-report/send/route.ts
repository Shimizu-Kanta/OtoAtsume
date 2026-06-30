import { NextResponse } from "next/server";

import { createDailySiteReport } from "@/lib/data/daily-report";
import { sendDailyReportToDiscord } from "@/lib/notifications/discord";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? undefined;
    const dryRun = url.searchParams.get("dryRun") === "1";

    const report = await createDailySiteReport(date);

    if (!dryRun) {
      await sendDailyReportToDiscord(report);
    }

    return NextResponse.json(
      dryRun
        ? {
            ok: true,
            report
          }
        : {
            ok: true,
            date: report.date
          }
    );
  } catch (error) {
    console.error("Daily report failed", error);

    return NextResponse.json(
      {
        error: "Failed to send daily report"
      },
      {
        status: 500
      }
    );
  }
}

function isAuthorized(request: Request) {
  const token = process.env.DAILY_REPORT_API_TOKEN;

  if (!token) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${token}`;
}