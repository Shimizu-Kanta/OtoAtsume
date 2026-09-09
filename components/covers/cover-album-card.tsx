"use client";

import { useState } from "react";
import Link from "next/link";

import { AddToBasketButton } from "@/components/basket/add-to-basket-button";
import { CoverJacket } from "@/components/covers/cover-jacket";
import { buildObiText } from "@/lib/covers/obi";
import { clampPerformerColor } from "@/lib/performer-color";
import type { CoverAlbum } from "@/lib/data/covers";
import { cn } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

// 裏ジャケに出す収録曲の最大件数。これを超えた分は「ほか N 曲」にまとめる。
const MAX_VISIBLE_TRACKS = 6;

// 棚に並ぶ一枚。CD ショップの什器では「カードの枠」を描かず、ジャケット本体の影と
// キャプションだけで一枚を表す（枠を描くと棚に差さっている感じが消える）。
// 外側に overflow-hidden を付けないこと: ジャケット右後ろの CD 盤がはみ出す前提。
export function CoverAlbumCard({
  album,
  representativeOnly = false
}: {
  album: CoverAlbum;
  // tracks が「検索で絞り込まれた結果」ではなく「代表1曲だけ」であることを呼び出し側が示す。
  // attachTrackCounts を通したトップページの棚がこれに当たる。データだけでは
  // 「検索で絞り込まれた」ケースと区別できない（どちらも tracks.length < totalTrackCount）ため、
  // 明示的に受け取る。true のときは裏ジャケを開かず、詳細ページへの導線だけを出す。
  representativeOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const head = album.tracks[0];
  const isAlbum = album.totalTrackCount > 1;
  const thumbnailUrl = head.sourceImageUrl ?? getYouTubeThumbnailUrl(album.sourceUrl);
  const performers = head.performers.map(({ performer }) => performer);
  const artists = head.song.artists.map(({ artist }) => artist.name).join(", ");
  // 収録曲を一覧できるのは、tracks がその動画の全曲を表しているときだけ。
  const showSetlist = isAlbum && !representativeOnly;
  // 検索で絞り込まれている場合のみ「一致: ◯◯」を出す。これが無いと曲名で検索したときに
  // 「探した曲がどのアルバムに入っているか分からない」状態になる。
  const matchedCount = album.tracks.length;
  const showMatch = showSetlist && matchedCount < album.totalTrackCount && matchedCount > 0;
  const visibleTracks = album.tracks.slice(0, MAX_VISIBLE_TRACKS);
  const hiddenTrackCount = album.tracks.length - visibleTracks.length;

  const performerColor = clampPerformerColor(
    performers.find((performer) => performer.colorCode)?.colorCode
  );
  const performerNames = performers.map((performer) => performer.name).join(", ");
  const obiText = buildObiText({
    trackCount: album.totalTrackCount,
    coverType: album.coverType,
    performedAt: album.performedAt
  });

  return (
    // カード外枠はリンクではない。バッジと収録曲リンクがあるため、カード全体を <a> で
    // 囲むと <a> の入れ子になり HTML として不正・スクリーンリーダーでも壊れる。
    // 代わりにタイトルの <a> に after:absolute after:inset-0 を付けて全面をクリック可能にする。
    <div className="group relative flex h-full min-w-0 flex-col gap-2.5">
      <CoverJacket
        src={thumbnailUrl}
        alt={`${album.sourceTitle ?? head.song.title} のサムネイル`}
        coverType={album.coverType}
        obiText={obiText}
        showDisc
        sizes="(min-width: 1280px) 200px, (min-width: 640px) 25vw, 45vw"
        iconClassName="size-9"
      >
        {/* 裏ジャケ（収録曲）。カードの高さを変えないよう、インライン展開せず
            ジャケット面に absolute で重ねる。PC はホバー、全デバイスでバッジ操作で開く。
            グレア（z-20）より上に出す必要があるので z-30。 */}
        {showSetlist ? (
          <div
            className={cn(
              // 裏ジャケは不透明にする。実物の CD でも裏ジャケは印刷面で透けないし、
              // 収録曲が読めることを最優先する。
              "absolute inset-0 z-30 flex flex-col bg-board p-2.5 transition-opacity duration-200",
              open
                ? "opacity-100"
                : "pointer-events-none opacity-0 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100"
            )}
          >
            <p className="mb-1.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-board-sub">
              Tracks
            </p>
            <ol className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
              {visibleTracks.map((track, index) => (
                <li key={track.id} className="flex gap-1.5 text-xs leading-5 text-board-ink">
                  <span className="shrink-0 font-mono tabular-nums text-board-sub">{index + 1}.</span>
                  <Link
                    href={`/covers/${track.id}`}
                    className="line-clamp-1 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {track.song.title}
                  </Link>
                </li>
              ))}
            </ol>
            {hiddenTrackCount > 0 ? (
              <p className="mt-1 shrink-0 text-xs leading-5 text-board-sub">
                ほか{hiddenTrackCount}曲
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 曲数バッジ。裏ジャケを持つときはタップ/クリックで開閉するボタン。
            左端は帯、右上は CD 盤の覗く側なので、右下に置く。
            代表1曲のみのときは帯に曲数が刷ってあるので、バッジは出さない。 */}
        {/* かごに入れる。左端は帯（w-[24px] / sm:w-[34px]）が占めるので、帯幅＋余白4px
            だけ右に逃がして帯の文字（曲数・種別・日付）に重ねない。帯幅を変えたらここも合わせる。
            裏ジャケ(z-30)・曲数バッジ(z-40)と重ならないよう z-40 にする。
            アルバムは代表1曲しか手元に無いので、動画IDから全曲に展開して入れる。 */}
        <div className="absolute bottom-1.5 left-[28px] sm:left-[38px] z-40">
          <AddToBasketButton
            coverIds={[head.id]}
            expandVideoId={isAlbum ? album.sourceVideoId : null}
            label={isAlbum ? `この一枚（全${album.totalTrackCount}曲）をかごに入れる` : "かごに入れる"}
          />
        </div>

        {showSetlist ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={`収録曲${album.totalTrackCount}曲を${open ? "閉じる" : "表示"}`}
            className="absolute bottom-1.5 right-1.5 z-40 inline-flex items-center rounded-[2px] bg-board/90 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-board-ink transition-colors hover:bg-board focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {album.totalTrackCount}曲
          </button>
        ) : null}
      </CoverJacket>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* カードのタイトルは文書構造上の見出しではないため、見出しタグを使わず装飾テキストにする
            （セクション見出しの h2 と階層が競合しないようにする）。
            遷移先は代表 cover の詳細ページ。このページは getOtherCoversBySourceVideoId と
            SetlistDisclosure により、既に同一動画の全曲を表示している。 */}
        <p className="line-clamp-2 text-[13px] font-bold leading-[18px] text-ink">
          <Link
            href={`/covers/${head.id}`}
            className="after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:underline focus-visible:outline-none"
          >
            {isAlbum ? album.sourceTitle ?? head.song.title : head.song.title}
          </Link>
        </p>

        {performerNames ? (
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate">
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", performerColor ? "" : "bg-[color:var(--slate-light)]")}
              style={performerColor ? { backgroundColor: performerColor } : undefined}
            />
            <span className="truncate">{performerNames}</span>
          </p>
        ) : null}

        {/* 値札の刷り込みに見立てたメタ行。アルバムは収録曲数、単曲は原曲アーティスト。 */}
        <p className="truncate font-mono text-[10px] tabular-nums tracking-[0.04em] text-[color:var(--slate-light)]">
          {isAlbum ? `全${album.totalTrackCount}曲` : artists}
        </p>

        {showMatch ? (
          <p className="truncate text-xs text-stamp">
            一致: {head.song.title}
            {matchedCount > 1 ? ` ほか${matchedCount - 1}曲` : ""}
          </p>
        ) : null}

        {/* 代表1曲のみのカードは裏ジャケを持たないので、全曲を見られる詳細ページへ誘導する。
            カード全体が stretched link で詳細ページに繋がっているため、ここは文言だけでよい。 */}
        {representativeOnly && isAlbum ? (
          <p className="truncate text-xs text-stamp">この配信の全{album.totalTrackCount}曲を見る</p>
        ) : null}
      </div>
    </div>
  );
}
