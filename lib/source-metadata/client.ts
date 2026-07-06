import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 300_000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

export type SourceMetadata = {
  canonicalUrl: string;
  title?: string;
  imageUrl?: string;
  siteName?: string;
  publishedDate?: string;
};

export class SourceMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceMetadataError";
  }
}

export async function fetchSourceMetadata(inputUrl: string): Promise<SourceMetadata> {
  const url = parseAllowedHttpUrl(inputUrl);
  const response = await safeFetch(url, 0);
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().startsWith("image/")) {
    return {
      canonicalUrl: response.url,
      imageUrl: response.url,
      title: response.url
    };
  }

  if (
    !contentType.toLowerCase().includes("text/html") &&
    !contentType.toLowerCase().includes("application/xhtml+xml")
  ) {
    throw new SourceMetadataError("このURLから画像情報を取得できませんでした。");
  }

  const html = await readLimitedText(response, MAX_HTML_BYTES);
  const baseUrl = new URL(response.url);

  const title =
    getMetaContent(html, ["og:title", "twitter:title"]) ??
    getTitleText(html) ??
    undefined;

  const imageCandidate = getMetaContent(html, [
    "og:image",
    "og:image:url",
    "twitter:image",
    "twitter:image:src"
  ]);

  const siteName = getMetaContent(html, ["og:site_name"]) ?? baseUrl.hostname;

  const publishedRaw = getMetaContent(html, [
    "article:published_time",
    "og:published_time"
  ]);

  return {
    canonicalUrl: response.url,
    title: title ? decodeHtmlEntities(title) : undefined,
    imageUrl: imageCandidate ? resolvePublicHttpUrl(imageCandidate, baseUrl) : undefined,
    siteName: siteName ? decodeHtmlEntities(siteName) : undefined,
    publishedDate: normalizeDate(publishedRaw)
  };
}

async function safeFetch(url: URL, redirectCount: number): Promise<Response> {
  await assertSafeUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5",
        "user-agent": "OtoAtsumeBot/1.0"
      }
    });

    if (isRedirect(response.status)) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new SourceMetadataError("リダイレクト回数が多すぎます。");
      }

      const location = response.headers.get("location");

      if (!location) {
        throw new SourceMetadataError("リダイレクト先を確認できませんでした。");
      }

      return safeFetch(new URL(location, url), redirectCount + 1);
    }

    if (!response.ok) {
      throw new SourceMetadataError("URLの取得に失敗しました。");
    }

    return response;
  } catch (error) {
    if (error instanceof SourceMetadataError) {
      throw error;
    }

    throw new SourceMetadataError("URLの取得に失敗しました。");
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseAllowedHttpUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new SourceMetadataError("正しいURLを入力してください。");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SourceMetadataError("httpまたはhttpsのURLを入力してください。");
  }

  return url;
}

async function assertSafeUrl(url: URL) {
  const host = url.hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new SourceMetadataError("このURLは使用できません。");
  }

  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new SourceMetadataError("URLの接続先を確認できませんでした。");
      });

  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new SourceMetadataError("このURLは使用できません。");
  }
}

function isPrivateAddress(address: string) {
  if (address.startsWith("::ffff:")) {
    return isPrivateIpv4(address.replace("::ffff:", ""));
  }

  if (isIP(address) === 4) {
    return isPrivateIpv4(address);
  }

  const lower = address.toLowerCase();

  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  );
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

async function readLimitedText(response: Response, maxBytes: number) {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    received += value.byteLength;

    if (received > maxBytes) {
      throw new SourceMetadataError("取得できるHTMLサイズを超えました。");
    }

    chunks.push(value);
  }

  const buffer = new Uint8Array(received);
  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(buffer);
}

function getMetaContent(html: string, keys: string[]) {
  const metaTags = html.match(/<meta\s+[^>]*>/gi) ?? [];

  for (const key of keys) {
    for (const tag of metaTags) {
      const property = getAttribute(tag, "property");
      const name = getAttribute(tag, "name");

      if (property !== key && name !== key) {
        continue;
      }

      const content = getAttribute(tag, "content");

      if (content) {
        return content.trim();
      }
    }
  }

  return undefined;
}

function getTitleText(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim();
}

function getAttribute(tag: string, name: string) {
  const quoted = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  if (quoted?.[1]) {
    return decodeHtmlEntities(quoted[1]);
  }

  const unquoted = new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i").exec(tag);
  return unquoted?.[1] ? decodeHtmlEntities(unquoted[1]) : undefined;
}

function resolvePublicHttpUrl(value: string, baseUrl: URL) {
  try {
    const url = new URL(value, baseUrl);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }

    const host = url.hostname.toLowerCase();

    if (host === "localhost" || host.endsWith(".localhost") || isPrivateAddress(host)) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function isRedirect(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}