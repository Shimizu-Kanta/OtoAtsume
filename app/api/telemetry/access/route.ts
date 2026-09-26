import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { clientIdentityHash, rateLimitPresets } from "@/lib/rate-limit/http";
import { checkRateLimit } from "@/lib/rate-limit/persistent";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 無制限に書き込めると集計の水増しや DB の肥大化につながるため、IP 単位で制限する。
    // 超過時もクライアント側の動作には影響させず、記録だけを捨てる。
    const limit = await checkRateLimit(
      `api:telemetry:access:${clientIdentityHash(request.headers, "api:telemetry:access")}`,
      rateLimitPresets.accessLog
    );

    if (!limit.allowed) {
      return NextResponse.json({ ok: true });
    }

    const { path } = (await request.json().catch(() => ({}))) as {
      path?: unknown;
    };

    if (typeof path !== "string" || !isPublicPagePath(path)) {
      return NextResponse.json({ ok: true });
    }

    await db.siteAccessLog.create({
      data: {
        path: normalizePath(path)
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Access log failed", error);
    return NextResponse.json({ ok: true });
  }
}

function normalizePath(path: string) {
  return path.split("?")[0].slice(0, 300);
}

function isPublicPagePath(path: string) {
  if (!path.startsWith("/")) {
    return false;
  }

  if (
    path.startsWith("/api") ||
    path.startsWith("/admin") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/robots") ||
    path.startsWith("/sitemap")
  ) {
    return false;
  }

  return true;
}