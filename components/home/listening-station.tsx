import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { CoverJacket } from "@/components/covers/cover-jacket";
import { buildObiText } from "@/lib/covers/obi";
import type { CoverAlbum } from "@/lib/data/covers";
import { formatDate, formatSeconds, withTimestamp } from "@/lib/utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

// 試聴機コーナー。黒板の筐体に一枚を掛けて、収録曲を並べる。
// 波形は静的な擬似波形（音声解析はしない）。sin の絶対値で山谷を作るだけ。
const WAVE_BARS = Array.from({ length: 44 }, (_, index) => {
  const height = 18 + Math.round(Math.abs(Math.sin(index * 0.8)) * 24) + (index % 3) * 3;
  return { key: index, height };
});

export function ListeningStation({ album }: { album: CoverAlbum }) {
  const head = album.tracks[0];
  const performers = head.performers.map(({ performer }) => performer.name).join(", ");
  const title = album.totalTrackCount > 1 ? album.sourceTitle ?? head.song.title : head.song.title;
  // 掛かっている一枚は、代表曲のタイムスタンプ位置から再生する。
  const listenUrl = withTimestamp(album.sourceUrl, head.timestampSeconds);

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-3.5">
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-[22px]">試聴機コーナー</h2>
        <span className="eyebrow-muted">listening station</span>
      </div>

      <div className="grid gap-6 rounded-[3px] bg-board p-[22px] shadow-board sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="mx-auto w-[180px] max-w-full sm:mx-0">
          <CoverJacket
            src={head.sourceImageUrl ?? getYouTubeThumbnailUrl(album.sourceUrl)}
            alt={`${title} のサムネイル`}
            coverType={album.coverType}
            obiText={buildObiText({
              trackCount: album.totalTrackCount,
              coverType: album.coverType,
              performedAt: album.performedAt
            })}
            sizes="180px"
            iconClassName="size-8"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow-board">now playing</p>
              <p className="mt-1.5 line-clamp-2 text-lg font-bold leading-[1.35] text-board-ink sm:text-[22px]">
                <Link href={`/covers/${head.id}`} className="underline-offset-4 hover:underline">
                  {title}
                </Link>
              </p>
              <p className="mt-1.5 truncate text-[13px] text-[color:var(--board-sub)]">
                {performers ? `${performers} ／ ` : ""}
                {formatDate(album.performedAt)}
              </p>
            </div>
            <a
              href={listenUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-[2px] bg-stamp px-5 text-sm font-bold text-white shadow-press transition-[filter] hover:brightness-110"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              情報元で聴く
            </a>
          </div>

          {/* 擬似波形（装飾）。 */}
          <div aria-hidden="true" className="flex h-11 items-end gap-[3px] px-0.5">
            {WAVE_BARS.map((bar) => (
              <span
                key={bar.key}
                className="flex-1 rounded-[1px] bg-[#6E8272]"
                style={{ height: `${bar.height}px` }}
              />
            ))}
          </div>

          <div className="border-t border-[#33453A] pt-3">
            <p className="eyebrow-board mb-2">tracks</p>
            <ol className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
              {album.tracks.map((track, index) => (
                <li
                  key={track.id}
                  className="flex min-w-0 items-baseline gap-2.5 border-b border-dotted border-[#33453A] py-1"
                >
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#7E9384]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/covers/${track.id}`}
                    className="truncate text-[13px] text-board-ink underline-offset-4 hover:underline"
                  >
                    {track.song.title}
                  </Link>
                  <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-[#7E9384]">
                    {track.timestampSeconds != null ? formatSeconds(track.timestampSeconds) : "-"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
