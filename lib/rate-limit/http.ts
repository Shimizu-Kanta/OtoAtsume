import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit/memory";

type HeaderReader = {
  get(name: string): string | null;
};

export const rateLimitPresets = {
  coverCreate: { limit: 20, windowMs: 60 * 60 * 1000 },
  reportCreate: { limit: 30, windowMs: 60 * 60 * 1000 },
  performerApplicationCreate: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  duplicateCheck: { limit: 120, windowMs: 60 * 60 * 1000 }
} as const;

function clientKey(headerReader: HeaderReader, scope: string) {
  const forwardedFor = headerReader.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerReader.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "local";

  return `${scope}:${ip}`;
}

export function checkRouteRateLimit(
  request: Request,
  scope: string,
  options: { limit: number; windowMs: number }
) {
  const result = checkRateLimit(clientKey(request.headers, scope), options);

  if (result.allowed) {
    return null;
  }

  const retryAfter = result.resetAt
    ? Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
    : Math.ceil(options.windowMs / 1000);

  return NextResponse.json(
    { error: "短時間にリクエストが多すぎます。少し待ってから再試行してください。" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) }
    }
  );
}

export async function checkServerActionRateLimit(
  scope: string,
  options: { limit: number; windowMs: number }
) {
  const headerStore = await headers();
  return checkRateLimit(clientKey(headerStore, scope), options);
}
