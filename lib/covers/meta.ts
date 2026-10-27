import { coverTypeLabel } from "@/lib/constants";

// カバー詳細ページ（/covers/[id]）の title / description。
// 「曲名＋活動者名」の検索では YouTube 本体と並ぶため、YouTube に無い情報
// （歌唱種別・歌枠の日付・同じ曲の他の活動者・同じ歌枠の他の曲）を入れて開く理由を作る。
// DB には触らず、入力から文字列を組み立てるだけにする。

export type CoverMetaInput = {
  songTitle: string;
  // 原曲アーティスト
  artistNames: string[];
  // この記録の活動者
  performerNames: string[];
  // 全活動者に共通の所属グループ。グループが混在する・未所属がいる場合は null
  groupName: string | null;
  coverType: string;
  performedAt: Date;
  // 同じ曲を歌った他の活動者（この記録の活動者を除く・重複なし・新しい順）
  otherSongPerformerNames: string[];
  // 同じ動画の他の曲（タイムスタンプ順）
  sameSourceSongTitles: string[];
  // 先頭の活動者の歌唱記録の総数（この記録を含む）
  performerCoverCount: number;
};

// title のページ固有部分（末尾の「 | おとあつめ」はルート layout のテンプレートが付ける）の上限。
// 「他N人のカバーも」を足すとこれを超える場合は足さない。検索結果で切れて曲名・活動者名側が読みにくくなるため。
const TITLE_MAX_LENGTH = 32;
// description はこの文字数を超える文を積まない。
const DESCRIPTION_MAX_LENGTH = 130;
// description に名前を並べる上限。
const DESCRIPTION_NAME_LIMIT = 2;

// 1つの動画に複数曲が入り、タイムスタンプで該当箇所を指す種別。
const MULTI_SONG_COVER_TYPES = new Set(["KARAOKE_STREAM", "LIVE_EVENT", "MEDLEY"]);

const TITLE_TAGS: Record<string, (date: string) => string | null> = {
  COVER_VIDEO: () => "【歌ってみた】",
  // 歌枠・ライブは同じ活動者が同じ曲を何度も歌うため、日付で title の重複を避ける。
  KARAOKE_STREAM: (date) => `【歌枠 ${date}】`,
  LIVE_EVENT: (date) => `【ライブ ${date}】`,
  MEDLEY: () => "【メドレー】",
  SHORT: () => "【ショート】",
  OTHER: () => null
};

// 歌唱日は日付のみの値（UTC 0時）として保存されている。表示は JST で揃える。
const slashDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const longDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric"
});

function length(value: string) {
  return [...value].length;
}

function joinNames(names: string[]) {
  return names.join("、");
}

// 文中では「歌ってみた動画」を「歌ってみた」と書く。
// 「その他」は「〜のその他。」と読めてしまうので「歌唱記録」と書く。
function sentenceLabel(coverType: string) {
  if (coverType === "OTHER") {
    return "歌唱記録";
  }
  return coverTypeLabel(coverType).replace("歌ってみた動画", "歌ってみた");
}

export function buildCoverTitle(input: CoverMetaInput) {
  const performers =
    input.performerNames.length >= 3
      ? `${input.performerNames[0]}、${input.performerNames[1]}ほか`
      : joinNames(input.performerNames);
  const tag = (TITLE_TAGS[input.coverType] ?? TITLE_TAGS.OTHER)(slashDateFormatter.format(input.performedAt));
  const base = performers ? `${input.songTitle} / ${performers}${tag ?? ""}` : `${input.songTitle}${tag ?? ""}`;

  const otherCount = input.otherSongPerformerNames.length;
  if (otherCount === 0) {
    return base;
  }

  // 【】で終わらないときは、活動者名に続けて読めないよう空白を挟む。
  const withOthers = `${base}${tag ? "" : " "}他${otherCount}人のカバーも`;
  return length(withOthers) > TITLE_MAX_LENGTH ? base : withOthers;
}

export function buildCoverDescription(input: CoverMetaInput) {
  // 合同曲で数十人並ぶと1文目だけで上限を超えるため、title と同じく先頭2人に絞る。
  const performers =
    input.performerNames.length >= 3
      ? `${input.performerNames[0]}、${input.performerNames[1]}ほか${input.performerNames.length - 2}人`
      : joinNames(input.performerNames);
  const subject = input.groupName ? `${performers}（${input.groupName}）` : performers;
  const song = `「${input.songTitle}」${input.artistNames.length > 0 ? `（原曲：${joinNames(input.artistNames)}）` : ""}`;
  const date = longDateFormatter.format(input.performedAt);
  const label = sentenceLabel(input.coverType);
  const otherCount = input.otherSongPerformerNames.length;

  const sentences: string[] = [];

  if (MULTI_SONG_COVER_TYPES.has(input.coverType)) {
    sentences.push(`${subject}が${date}の${label}で歌った${song}。タイムスタンプ付きで該当箇所から聴けます。`);

    const otherSongCount = input.sameSourceSongTitles.length;
    if (otherSongCount > 0) {
      sentences.push(
        `この${label}では他に${otherSongCount}曲を歌唱（${joinNames(input.sameSourceSongTitles.slice(0, DESCRIPTION_NAME_LIMIT))}など）。`
      );
    }
    if (otherCount > 0) {
      sentences.push(`同じ曲は他に${otherCount}人がカバー。`);
    }
  } else {
    sentences.push(`${subject}が${date}に公開した${song}の${label}。`);

    if (otherCount > 0) {
      sentences.push(
        `同じ曲は他に${otherCount}人がカバー（${joinNames(input.otherSongPerformerNames.slice(0, DESCRIPTION_NAME_LIMIT))}など）。`
      );
    }
    // 活動者が複数いても、件数は先頭の活動者のもので出す。この1件だけなら言う意味が無いので出さない。
    if (input.performerNames.length > 0 && input.performerCoverCount >= 2) {
      sentences.push(`${input.performerNames[0]}の歌唱記録は全${input.performerCoverCount}件。`);
    }
  }

  // 先頭の文は必ず入れ、2文目以降は上限を超えるものだけ飛ばす。
  return sentences.reduce((description, sentence) =>
    length(description + sentence) > DESCRIPTION_MAX_LENGTH ? description : description + sentence
  );
}

export function buildCoverMeta(input: CoverMetaInput): { title: string; description: string } {
  return {
    title: buildCoverTitle(input),
    description: buildCoverDescription(input)
  };
}
