import { PageHeading } from "@/components/page-heading";
import { PlaylistForm } from "@/components/playlist/playlist-form";
import { PlaylistResult } from "@/components/playlist/playlist-result";
import {
  PLAYLIST_DEFAULT_COUNT,
  PLAYLIST_MAX_ARTISTS,
  PLAYLIST_MAX_COUNT,
  generateRandomPlaylist
} from "@/lib/data/playlist";
import { getSearchParam, getSearchParamAll, isFilteredListing } from "@/lib/utils";
import type { Metadata } from "next";

// 表示のたびに抽選し直すため、キャッシュもプリレンダーもしない。
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;

  return {
    title: "おまかせプレイリスト",
    description:
      "おとあつめに登録された歌ってみた動画から、曲数・公開日・原曲アーティストを指定してランダムにプレイリストを作り、YouTubeでまとめて再生できます。",
    robots: isFilteredListing(params) ? { index: false, follow: true } : undefined,
    alternates: { canonical: "/playlist" }
  };
}

function parseCount(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return PLAYLIST_DEFAULT_COUNT;
  }
  return Math.min(Math.max(parsed, 1), PLAYLIST_MAX_COUNT);
}

function parseDateParam(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function PlaylistPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const count = parseCount(getSearchParam(params, "count"));
  let dateFrom = parseDateParam(getSearchParam(params, "dateFrom"));
  let dateTo = parseDateParam(getSearchParam(params, "dateTo"));
  // 開始日と終了日が逆に入っていたら入れ替える（0件になる理由が分かりにくいため）。
  if (dateFrom && dateTo && dateFrom > dateTo) {
    [dateFrom, dateTo] = [dateTo, dateFrom];
  }
  const artists = Array.from(
    new Set(
      getSearchParamAll(params, "artist")
        .map((name) => name.trim())
        .filter((name) => name.length > 0 && name.length <= 100)
    )
  ).slice(0, PLAYLIST_MAX_ARTISTS);
  const allowDuplicateSongs = getSearchParam(params, "dup") === "1";

  const { tracks, candidateCount } = await generateRandomPlaylist({
    count,
    dateFrom,
    dateTo,
    artists,
    allowDuplicateSongs
  });

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="shuffle playlist"
        title="おまかせプレイリスト"
        description="登録されている歌ってみた動画からランダムに選んでプレイリストを作ります。歌枠・ライブ・メドレー・ショートなど、1本に複数曲が入った動画や短い動画は含まれません。"
      />

      <PlaylistForm
        count={count}
        dateFrom={dateFrom}
        dateTo={dateTo}
        artists={artists}
        allowDuplicateSongs={allowDuplicateSongs}
        maxCount={PLAYLIST_MAX_COUNT}
        maxArtists={PLAYLIST_MAX_ARTISTS}
        submitLabel={tracks.length > 0 ? "もう一度シャッフル" : "プレイリストを作る"}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">今回のプレイリスト</h2>
          <p className="font-mono text-xs tabular-nums text-slate">{tracks.length}曲</p>
        </div>

        {tracks.length === 0 ? (
          <p className="rounded-[2px] border border-dashed border-rule p-4 text-sm leading-[1.9] text-slate">
            条件に合う歌ってみた動画が見つかりませんでした。期間やアーティストの条件をゆるめてみてください。
          </p>
        ) : (
          <>
            {tracks.length < count ? (
              <p className="text-xs text-slate">
                条件に合う曲が{tracks.length}曲だけだったため、{count}曲に届きませんでした。
                {!allowDuplicateSongs && candidateCount > tracks.length
                  ? "「同じ曲の別の歌唱を重複して入れてもよい」にチェックすると増える場合があります。"
                  : null}
              </p>
            ) : null}
            <PlaylistResult tracks={tracks} />
          </>
        )}
      </section>
    </div>
  );
}
