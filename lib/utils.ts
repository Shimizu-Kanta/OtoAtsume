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

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function withTimestamp(sourceUrl: string, timestampSeconds: number | null | undefined) {
  if (timestampSeconds == null) {
    return sourceUrl;
  }

  const separator = sourceUrl.includes("?") ? "&" : "?";
  return `${sourceUrl}${separator}t=${timestampSeconds}`;
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
