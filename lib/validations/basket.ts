import { z } from "zod";

import { BASKET_MAX } from "@/lib/basket/storage";

export const basketResolveSchema = z.object({
  // かごの上限と同じ数までしか受け付けない。
  // ID の形式は厳しく見ない。localStorage に壊れた値が1件でも混ざったときに
  // リクエスト全体が 400 になると、かごが自力で復旧できなくなるため。
  // 存在しない ID は「解決結果に含まれない → クライアント側で取り除かれる」で処理する。
  ids: z.array(z.string().min(1).max(64)).max(BASKET_MAX)
});

export const basketExpandSchema = z.object({
  videoId: z.string().min(1).max(64)
});
