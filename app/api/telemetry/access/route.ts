import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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