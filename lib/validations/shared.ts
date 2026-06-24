import { z } from "zod";

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

export const pastOrTodayDate = z.coerce.date().refine(
  (date) => date.getTime() <= Date.now(),
  "未来日付は登録できません。"
);
