import { z } from "zod";

const colorCodePattern = /^#?[0-9A-Fa-f]{6}$/;
const normalizedColorCodePattern = /^#[0-9A-F]{6}$/;
const dateInputPattern = /^\d{4}-\d{2}-\d{2}$/;
const birthdayInputPattern = /^(?:\d{4}[-/])?(\d{1,2})[-/](\d{1,2})$/;

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeColorCode(value: unknown) {
  const text = optionalString(value);
  if (!text) {
    return undefined;
  }

  if (!colorCodePattern.test(text)) {
    return text;
  }

  const hex = text.startsWith("#") ? text.slice(1) : text;
  return `#${hex.toUpperCase()}`;
}

export function parseDateInput(value: unknown) {
  const text = optionalString(value);
  if (!text) {
    return undefined;
  }

  if (!dateInputPattern.test(text)) {
    return text;
  }

  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return valid ? date : text;
}

export function parseBirthdayInput(value: unknown) {
  const text = optionalString(value);

  if (!text) {
    return undefined;
  }

  const match = text.match(birthdayInputPattern);

  if (!match) {
    return text;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(2000, month - 1, day));

  const valid =
    date.getUTCFullYear() === 2000 &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return valid ? date : text;
}

export function normalizeTagNames(value: string | string[] | null | undefined) {
  const rawValues = Array.isArray(value) ? value : (value ?? "").split(";");
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawValue of rawValues) {
    const tag = rawValue.trim();
    if (!tag || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export const colorCodeSchema = z.preprocess(
  normalizeColorCode,
  z
    .string()
    .regex(normalizedColorCodePattern, "#RRGGBB 形式で入力してください。")
    .optional()
);

export const debutDateSchema = z.preprocess(
  parseDateInput,
  z.date({ invalid_type_error: "デビュー日は YYYY-MM-DD 形式で入力してください。" }).optional()
);

export const birthdaySchema = z.preprocess(
  parseDateInput,
  z.date({ invalid_type_error: "誕生日は MM-DD 形式で入力してください。" }).optional()
);

export const tagNamesSchema = z.preprocess(
  (value) => normalizeTagNames(typeof value === "string" || Array.isArray(value) ? value : undefined),
  z.array(z.string().max(80, "タグ名は80文字以内で入力してください。")).default([])
);
