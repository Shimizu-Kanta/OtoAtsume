import type { DailySiteReportSummary } from "@/lib/data/daily-report";

export async function sendDailyReportToDiscord(report: DailySiteReportSummary) {
  const webhookUrl = process.env.DISCORD_DAILY_REPORT_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("DISCORD_DAILY_REPORT_WEBHOOK_URL is not set.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: formatDailyReportMessage(report),
      allowed_mentions: {
        parse: []
      }
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord webhook failed: ${response.status} ${body.slice(0, 200)}`);
  }
}

function formatDailyReportMessage(report: DailySiteReportSummary) {
  const errorLines = Object.entries(report.errorCounts);

  const errorText =
    errorLines.length > 0
      ? errorLines.map(([type, count]) => `- ${type}: ${count}`).join("\n")
      : "- なし";

  return [
    "📊 **おとあつめ 日次レポート**",
    `対象日: ${report.date}`,
    "",
    `一日のアクセス数: ${report.accessCount}`,
    `一日の追加カバー数: ${report.addedCoverCount}`,
    `一日の新規楽曲数: ${report.addedSongCount}`,
    "",
    "一日のエラー回数:",
    errorText,
    "",
    `未処理通報数: ${report.pendingReportCount}`,
    `確認待ち活動者数: ${report.pendingPerformerCount}`
  ].join("\n");
}
