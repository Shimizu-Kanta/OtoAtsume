import { z } from "zod";

import { formatDateInput, parseDateOnly, toTokyoDateKey } from "@/lib/utils";

export const optionalText = (max = 1000) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().trim().max(max).optional()
  );

export const optionalNonNegativeInteger = z.preprocess(
  (value) => {
    if (value === "" || value == null) {
      return undefined;
    }

    if (typeof value === "string") {
      return Number(value);
    }

    return value;
  },
  z.number().int().nonnegative().optional()
);

export const formStringArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
}, z.array(z.string().trim().min(1)).default([]));

// 日付のみの入力（"YYYY-MM-DD"）。存在しない日付（2月31日など）は弾く。
// Date インスタンス（サーバー内部から渡される値）はそのまま受け付ける。
export const dateOnly = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    // API 経由で "2026-01-01T00:00:00.000Z" のような日時が来た場合は日付部分だけを使う。
    const trimmed = value.trim();
    const dateKey = /^\d{4}-\d{2}-\d{2}T/.test(trimmed) ? trimmed.slice(0, 10) : trimmed;

    return parseDateOnly(dateKey) ?? new Date(Number.NaN);
  },
  z.date({ errorMap: () => ({ message: "日付の形式が正しくありません。" }) })
);

// 「今日」は日本時間で判定する。入力値は UTC 0時で表されるため、Date.now() と直接比べると
// JST 0〜9時の間は当日の日付が「未来日付」として弾かれてしまう。
export const pastOrTodayDate = dateOnly.refine(
  (date) => formatDateInput(date) <= toTokyoDateKey(new Date()),
  "未来日付は登録できません。"
);
