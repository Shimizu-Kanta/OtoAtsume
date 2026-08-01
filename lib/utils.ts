import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeNames(value: string | string[] | null | undefined) {
  const text = Array.isArray(value) ? value.join(",") : value ?? "";

  return Array.from(
    new Set(
      text
        .split(/[\n,、]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function toOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDateInput(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatSeconds(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// "mm:ss" / "h:mm:ss" / "hh:mm:ss" を秒に変換する（formatSeconds の逆変換）。
// 不正な形式は null を返す。
export function parseTimestampToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const nums = parts.map((part) => Number(part));
  if (nums.some((num) => !Number.isInteger(num) || num < 0)) {
    return null;
  }

  if (nums.length === 2) {
    const [minutes, seconds] = nums;
    if (seconds >= 60) {
      return null;
    }
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = nums;
  if (minutes >= 60 || seconds >= 60) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
}

// 表示・外部リンク用に sourceUrl へタイムスタンプ（t=秒数）を付与する。
// 既に t= を含む URL でも二重に付かないよう、URL API で置き換える。
export function withTimestamp(sourceUrl: string, timestampSeconds: number | null | undefined) {
  if (timestampSeconds == null) {
    return sourceUrl;
  }

  try {
    const url = new URL(sourceUrl);
    url.searchParams.set("t", String(timestampSeconds));
    return url.toString();
  } catch {
    // URL として解釈できない場合は、既存の t= を除去してから付与する。
    const withoutTimestamp = sourceUrl.replace(/([?&])t=[^&]*/g, "$1").replace(/[?&]+$/, "");
    const separator = withoutTimestamp.includes("?") ? "&" : "?";
    return `${withoutTimestamp}${separator}t=${timestampSeconds}`;
  }
}

const OPTIMIZABLE_IMAGE_HOSTS = new Set(["img.youtube.com", "i.ytimg.com"]);

// Keep in sync with images.remotePatterns in next.config.mjs — unconfigured
// hosts must fall back to unoptimized rendering or next/image throws at runtime.
export function isOptimizableImageUrl(url: string) {
  try {
    return OPTIMIZABLE_IMAGE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getSearchParamAll(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

export function parsePageParam(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

// 一覧ページで noindex にすべきか（検索条件つき・2ページ目以降）を判定する。
// view（表示形式トグル）は同一コンテンツのため無視する。0件結果の大半は
// 検索条件つきアクセスなのでこの判定に含まれる。
export function isFilteredListing(
  params: Record<string, string | string[] | undefined>,
  ignore: string[] = ["view"]
) {
  if (parsePageParam(getSearchParam(params, "page")) > 1) {
    return true;
  }

  return Object.entries(params).some(([key, value]) => {
    if (key === "page" || ignore.includes(key)) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== undefined && value !== "";
  });
}

// `?tags=id1&tags=id2` と `?tags=id1,id2` の両形式からタグIDの配列を取り出す。
export function getSelectedTagIds(searchParams: Record<string, string | string[] | undefined>) {
  const raw = searchParams.tags;
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}
