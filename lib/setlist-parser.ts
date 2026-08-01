import { parseTimestampToSeconds } from "@/lib/utils";

export type ParsedSetlistRow = {
  timestampSeconds: number;
  rawText: string; // タイムスタンプを除いた行の残り
  songTitleGuess: string; // rawText から装飾を除去した推定曲名
};

// 行頭・空白・装飾記号に続くタイムスタンプ（0:00 / 00:00 / 1:23:45 / 01:23:45）
const TIMESTAMP_PATTERN = /(?:^|[\s【\[（(▼•・>›\-])((?:\d{1,2}:)?\d{1,2}:\d{2})(?:[】\]）)\s]|$)/;

// rawText から曲名らしい部分を推定する。
function guessSongTitle(rawText: string): string {
  let text = rawText.trim();

  // 先頭の装飾記号・区切りを除去
  text = text.replace(/^[\s\-–—~〜:：・|｜/／★☆▶▷▼◆●○\]】)）]+/, "").trim();
  // 末尾の装飾記号を除去
  text = text.replace(/[\s\-–—~〜:：・|｜]+$/, "").trim();

  // 「曲名 / アーティスト名」形式は区切り以降を落とす（曲名側を優先）
  const slashIndex = text.search(/[/／]/);
  if (slashIndex > 0) {
    text = text.slice(0, slashIndex).trim();
  }

  return text;
}

export function parseSetlistFromDescription(description: string): ParsedSetlistRow[] {
  const rows: ParsedSetlistRow[] = [];
  const seen = new Set<number>();

  for (const line of description.split(/\r?\n/)) {
    const match = TIMESTAMP_PATTERN.exec(line);
    if (!match) {
      continue;
    }

    const timestamp = match[1];
    const timestampSeconds = parseTimestampToSeconds(timestamp);
    if (timestampSeconds == null || seen.has(timestampSeconds)) {
      continue;
    }
    seen.add(timestampSeconds);

    // タイムスタンプの出現位置以降をテキストとして扱う
    const afterIndex = line.indexOf(timestamp) + timestamp.length;
    const rawText = line.slice(afterIndex).trim();

    rows.push({
      timestampSeconds,
      rawText,
      songTitleGuess: guessSongTitle(rawText)
    });
  }

  return rows.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}
