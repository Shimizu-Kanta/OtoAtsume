import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

import { checkRateLimit } from "@/lib/rate-limit/persistent";

type HeaderReader = {
  get(name: string): string | null;
};

export const rateLimitPresets = {
  coverCreate: { limit: 20, windowMs: 60 * 60 * 1000 },
  reportCreate: { limit: 30, windowMs: 60 * 60 * 1000 },
  performerApplicationCreate: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  duplicateCheck: { limit: 120, windowMs: 60 * 60 * 1000 },
  watchlistCheck: { limit: 60, windowMs: 60 * 60 * 1000 },
  // ウォッチリストは最大10件で、追加操作のたびに1回だけ呼ばれる。
  songRequestLog: { limit: 30, windowMs: 60 * 60 * 1000 },
  // かごは描画のたびに解決するため、他より緩めに取る。
  basketResolve: { limit: 240, windowMs: 60 * 60 * 1000 },
  basketExpand: { limit: 120, windowMs: 60 * 60 * 1000 },
  // ページ遷移ごとに1回送られるアクセスログ。通常の閲覧では届かない程度に緩めに取る。
  accessLog: { limit: 600, windowMs: 60 * 60 * 1000 }
} as const;

// 信頼できるプロキシが X-Forwarded-For に追記する段数。
// Cloud Run に直接アクセスする構成では Google Front End が末尾に接続元IPを1つ追記するため 1。
// 外部 HTTPS ロードバランサ等を前段に挟む場合は、その分だけ増やす（環境変数で上書き可能）。
function trustedProxyHops() {
  const value = Number(process.env.RATE_LIMIT_TRUSTED_PROXY_HOPS ?? "1");
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

// レート制限・重複排除に使うクライアントIP。
// X-Forwarded-For の先頭はクライアントが自由に書き換えられるため使わず、
// 信頼できるプロキシが追記した「右から N 番目」を採用する。
export function clientIpFromHeaders(headerReader: HeaderReader) {
  const forwardedFor = (headerReader.get("x-forwarded-for") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const hops = trustedProxyHops();

  if (forwardedFor.length >= hops) {
    return forwardedFor[forwardedFor.length - hops];
  }

  return forwardedFor[0] || "local";
}

// クライアント(IP)を識別するハッシュ。scope ごとに異なる値になるため、
// 用途をまたいで同一クライアントを突き合わせることはできない。
// User-Agent はクライアントが任意に変えられ、付け替えるだけで別クライアント扱いになって
// レート制限や重複排除をすり抜けられるため、識別キーには含めない。
export function clientIdentityHash(headerReader: HeaderReader, scope: string) {
  const ip = clientIpFromHeaders(headerReader);
  const salt = process.env.AUTH_SECRET || process.env.CAPTCHA_SECRET_KEY || "otoatsume-rate-limit";

  return createHash("sha256").update(`${salt}:${scope}:${ip}`).digest("hex");
}

function clientKey(headerReader: HeaderReader, scope: string) {
  return `${scope}:${clientIdentityHash(headerReader, scope)}`;
}

export async function checkRouteRateLimit(
  request: Request,
  scope: string,
  options: { limit: number; windowMs: number }
) {
  const result = await checkRateLimit(clientKey(request.headers, scope), options);

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
