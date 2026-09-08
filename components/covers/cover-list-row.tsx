import Link from "next/link";

import type { CoverListItem } from "@/lib/data/covers";
import { coverTypeLabel } from "@/lib/constants";
import { clampPerformerColor } from "@/lib/performer-color";
import { formatDate } from "@/lib/utils";

// 在庫台帳（リスト表示）の列。行ヘッダーと各行で同じ定義を使う。
// 画面が狭い場合は縦積みに変換せず、テーブル全体を横スクロールで見せる（列比率を維持）。
// min-w と親の overflow-x-auto はセットで必須。
export const LEDGER_GRID =
  "grid min-w-[720px] grid-cols-[34px_minmax(200px,1fr)_132px_88px_84px] items-center gap-3";

// 在庫台帳の1行。左端は棚に差さった背表紙（活動者カラー）に見立てる。
// 歌唱記録一覧・歌唱記録詳細の関連セクションで再利用する。
export function CoverListRow({ cover }: { cover: CoverListItem }) {
  const artists = cover.song.artists.map(({ artist }) => artist.name).join(", ");
  const performers = cover.performers.map(({ performer }) => performer);
  const spineColor = clampPerformerColor(performers.find((performer) => performer.colorCode)?.colorCode);
  const performerNames = performers.map((performer) => performer.name).join(", ");

  return (
    <Link
      href={`/covers/${cover.id}`}
      className={`${LEDGER_GRID} border-t border-rule px-3.5 py-2.5 transition-colors hover:bg-hover`}
    >
      <span
        aria-hidden="true"
        className="h-[34px] w-[18px] rounded-[1px] shadow-spine"
        style={{ backgroundColor: spineColor ?? "var(--slate-light)" }}
      />

      <span className="block min-w-0">
        <span className="block truncate text-sm font-bold text-ink">{cover.song.title}</span>
        {artists ? (
          <span className="block truncate text-xs text-[color:var(--slate-light)]">{artists}</span>
        ) : null}
      </span>

      <span className="truncate text-[13px] text-slate">{performerNames}</span>

      <span className="truncate text-xs text-slate">{coverTypeLabel(cover.coverType)}</span>

      <span className="text-right font-mono text-xs tabular-nums text-slate">
        {formatDate(cover.performedAt)}
      </span>
    </Link>
  );
}
