import { Prisma, PrismaClient } from "@prisma/client";

import { escapeLikePattern } from "@/lib/utils";

type DbClient = PrismaClient | Prisma.TransactionClient;

// 原曲アーティストの集合を比較用のキーにする（大文字小文字・並び順・重複を無視）。
export function artistSetKey(artistNames: string[]) {
  return Array.from(new Set(artistNames.map((name) => name.trim().toLowerCase()).filter(Boolean)))
    .sort()
    .join("\u0000");
}

export type SongIdentityMatch = {
  id: string;
  title: string;
  // アーティスト未設定の既存楽曲に一致した場合 true（呼び出し側でアーティストを補完する）。
  needsArtists: boolean;
};

// 楽曲の同一性は「楽曲名（大文字小文字無視の完全一致）+ 原曲アーティストの集合」で判定する。
// 同名の別曲（例: 別アーティストの「Lemon」）を1つの楽曲にまとめてしまい、
// 既存楽曲へ無関係なアーティストが追加される事故を防ぐため、タイトルだけでは一致させない。
// 例外として、アーティストが1人も紐づいていない既存楽曲（管理画面で作成途中のもの等）は
// 同名であれば同一とみなし、アーティストを補完させる。
export async function findSongByTitleAndArtists(
  client: DbClient,
  title: string,
  artistNames: string[]
): Promise<SongIdentityMatch | null> {
  const candidates = await client.song.findMany({
    where: { title: { equals: escapeLikePattern(title.trim()), mode: Prisma.QueryMode.insensitive } },
    select: {
      id: true,
      title: true,
      artists: { select: { artist: { select: { name: true } } } }
    },
    orderBy: { createdAt: "asc" }
  });

  const key = artistSetKey(artistNames);
  const exact = candidates.find(
    (song) => artistSetKey(song.artists.map(({ artist }) => artist.name)) === key
  );

  if (exact) {
    return { id: exact.id, title: exact.title, needsArtists: false };
  }

  const artistless = candidates.find((song) => song.artists.length === 0);

  if (artistless && key) {
    return { id: artistless.id, title: artistless.title, needsArtists: true };
  }

  return null;
}

// 楽曲名だけが分かっている場面（重複警告など）で、同名楽曲の ID をすべて返す。
export async function findSongIdsByTitle(client: DbClient, title: string) {
  const songs = await client.song.findMany({
    where: { title: { equals: escapeLikePattern(title.trim()), mode: Prisma.QueryMode.insensitive } },
    select: { id: true }
  });

  return songs.map((song) => song.id);
}
