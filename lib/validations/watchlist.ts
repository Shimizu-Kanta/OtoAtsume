import { z } from "zod";

export const watchlistCheckItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  songName: z.string().trim().min(1).max(200),
  artistName: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((value) => value || null),
  songId: z.string().uuid().nullable().optional(),
  addedAt: z.coerce.date(),
  lastCheckedAt: z.coerce.date().nullable().optional()
});

export const watchlistCheckSchema = z.object({
  items: z.array(watchlistCheckItemSchema).min(1).max(10)
});

export type WatchlistCheckInput = z.infer<typeof watchlistCheckSchema>;
