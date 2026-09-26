import { z } from "zod";

import { coverTypeOptions } from "@/lib/constants";
import { normalizeNames } from "@/lib/utils";
import {
  formStringArray,
  optionalNonNegativeInteger,
  optionalText,
  pastOrTodayDate
} from "@/lib/validations/shared";

const coverTypeValues = coverTypeOptions.map((option) => option.value) as [
  string,
  ...string[]
];

// 情報元URL・画像URLは http(s) のみ許可する（javascript: や data: 等をリンク・画像に使わせない）。
const httpUrl = z
  .string()
  .trim()
  .url("URLの形式が正しくありません。")
  .max(2000)
  .refine((value) => /^https?:\/\//i.test(value), "http または https のURLを入力してください。");

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  httpUrl.optional()
);

export const coverCreateSchema = z
  .object({
    performerIds: formStringArray,
    performerNames: optionalText(500),
    songTitle: z.string().trim().min(1).max(200),
    artistNames: z.string().trim().min(1).max(500),
    performedAt: pastOrTodayDate,
    coverType: z.enum(coverTypeValues),
    sourceUrl: httpUrl,
    sourceTitle: optionalText(300),
    sourceImageUrl: optionalUrl,
    timestampSeconds: optionalNonNegativeInteger
  })
  .superRefine((value, context) => {
    if (value.performerIds.length === 0 && normalizeNames(value.performerNames).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["performerNames"],
        message: "活動者を指定してください。"
      });
    }
  });

// 歌枠・ライブ・メドレー（1URL複数曲）の共通項目。単曲の coverCreateSchema と同じ規則で検証する。
export const multiSongCoverCommonSchema = z.object({
  sourceUrl: httpUrl,
  sourceTitle: optionalText(300),
  sourceImageUrl: optionalUrl,
  performedAt: pastOrTodayDate
});

export const coverUpdateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "HIDDEN"]).optional(),
  sourceTitle: optionalText(300)
});

export const adminCoverEditSchema = z
  .object({
    performerIds: formStringArray,
    performerNames: optionalText(500),
    songTitle: z.string().trim().min(1).max(200),
    artistNames: z.string().trim().min(1).max(500),
    performedAt: pastOrTodayDate,
    coverType: z.enum(coverTypeValues),
    sourceUrl: httpUrl,
    sourceTitle: optionalText(300),
    timestampSeconds: optionalNonNegativeInteger,
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "HIDDEN"])
  })
  .superRefine((value, context) => {
    if (value.performerIds.length === 0 && normalizeNames(value.performerNames).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["performerNames"],
        message: "活動者を指定してください。"
      });
    }
  });

export const duplicateCandidateSchema = z
  .object({
    performerIds: formStringArray,
    performerNames: optionalText(500),
    songTitle: z.string().trim().min(1).max(200),
    performedAt: z.coerce.date(),
    sourceUrl: httpUrl,
    timestampSeconds: optionalNonNegativeInteger
  })
  .superRefine((value, context) => {
    if (value.performerIds.length === 0 && normalizeNames(value.performerNames).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["performerNames"],
        message: "活動者を指定してください。"
      });
    }
  });

export type CoverCreateInput = z.infer<typeof coverCreateSchema>;
export type CoverUpdateInput = z.infer<typeof coverUpdateSchema>;
export type AdminCoverEditInput = z.infer<typeof adminCoverEditSchema>;
export type DuplicateCandidateInput = z.infer<typeof duplicateCandidateSchema>;
