import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import {
  buildExportTable,
  isExportFormat,
  isExportTarget,
  isSongOriginalUrlFilter,
  serializeExport
} from "@/lib/exports/master-data";

export const dynamic = "force-dynamic";

// 管理者のみ: /api/admin/exports?target=songs&format=csv&originalUrl=missing
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target");
  const format = searchParams.get("format") ?? "csv";
  const originalUrl = searchParams.get("originalUrl") ?? "all";

  if (!isExportTarget(target)) {
    return NextResponse.json({ error: "target が不正です。" }, { status: 400 });
  }
  if (!isExportFormat(format)) {
    return NextResponse.json({ error: "format は csv または json を指定してください。" }, { status: 400 });
  }
  if (!isSongOriginalUrlFilter(originalUrl)) {
    return NextResponse.json({ error: "originalUrl は all / missing / present を指定してください。" }, { status: 400 });
  }

  const table = await buildExportTable(target, { songOriginalUrl: originalUrl });
  const body = serializeExport(table, format);
  const suffix = target === "songs" && originalUrl !== "all" ? `-originalurl-${originalUrl}` : "";
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `otoatsume-${target}${suffix}-${stamp}.${format}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Export-Row-Count": String(table.rows.length)
    }
  });
}
