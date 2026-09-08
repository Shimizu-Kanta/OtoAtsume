import type { BasketItem } from "@/lib/basket/types";
import { withTimestamp } from "@/lib/utils";

// watch_videos が一度に受け取れる本数の上限。
export const TAKEAWAY_MAX_VIDEOS = 50;

export type TakeawayPlaylist = {
  url: string | null;
  videoCount: number;
  // 50本を超えて切り詰めたか。UI で明示する。
  truncated: boolean;
};

// 「通して聴く」用の一時プレイリスト URL。
//
// 注意: このエンドポイントは YouTube の公式ドキュメントに載っていない。
// 将来予告なく動かなくなる可能性があるため、必ず「曲リストをコピー」
// （buildTrackListText）を併設し、片方が壊れても持ち帰りが全損しないようにすること。
//
// 同じ配信から何曲かごに入っていても、持ち帰りリストには動画1本だけを入れる。
// 実店舗でも1曲だけ買うことはできず、買うのは盤であるという比喩に合わせている。
// この URL は動画単位なのでタイムスタンプは指定できない（仕様であって不具合ではない）。
export function buildTakeawayPlaylist(items: BasketItem[]): TakeawayPlaylist {
  const videoIds: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.sourceVideoId || seen.has(item.sourceVideoId)) {
      continue;
    }
    seen.add(item.sourceVideoId);
    videoIds.push(item.sourceVideoId);
  }

  if (videoIds.length === 0) {
    return { url: null, videoCount: 0, truncated: false };
  }

  const truncated = videoIds.length > TAKEAWAY_MAX_VIDEOS;
  const used = truncated ? videoIds.slice(0, TAKEAWAY_MAX_VIDEOS) : videoIds;

  return {
    url: `https://www.youtube.com/watch_videos?video_ids=${used.join(",")}`,
    videoCount: used.length,
    truncated
  };
}

// 「曲リストをコピー」用のテキスト。こちらは外部の仕様に依存しないので絶対に壊れない。
// セットリストをSNSに貼りたい人にも使える。
export function buildTrackListText(items: BasketItem[]): string {
  return items
    .map((item, index) => {
      const who = item.performerNames ? ` / ${item.performerNames}` : "";
      const url = withTimestamp(item.sourceUrl, item.startSeconds);
      return `${index + 1}. ${item.songTitle}${who}\n   ${url}`;
    })
    .join("\n");
}
