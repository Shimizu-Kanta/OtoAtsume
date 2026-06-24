import { z } from "zod";

import { optionalText } from "@/lib/validations/shared";

export const performerCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  groupId: optionalText(200),
  youtubeUrl: optionalText(2000).refine((value) => !value || z.string().url().safeParse(value).success, {
    message: "YouTube URLが正しくありません。"
  }),
  officialUrl: optionalText(2000).refine((value) => !value || z.string().url().safeParse(value).success, {
    message: "公式URLが正しくありません。"
  }),
  status: z.enum(["PENDING", "APPROVED", "HIDDEN"]).default("APPROVED")
});

export const artistCreateSchema = z.object({
  name: z.string().trim().min(1).max(200)
});

export const songCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artistIds: z.array(z.string().min(1)).default([]),
  originalUrl: optionalText(2000).refine((value) => !value || z.string().url().safeParse(value).success, {
    message: "原曲URLが正しくありません。"
  })
});
