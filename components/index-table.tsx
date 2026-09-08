import Link from "next/link";

import { clampPerformerColor } from "@/lib/performer-color";

export type IndexTableRow = {
  key: string;
  href: string;
  name: string;
  sub?: string | null;
  count: number;
  // 背表紙の色。活動者では活動者カラー、楽曲・グループでは木の色を使う。
  colorCode?: string | null;
};

// 活動者インデックス / 楽曲カタログ共通の一覧。棚に背表紙が並んでいる見立てで、
// 左端に色付きの背表紙、右に在庫バー（その列の最大値を 100% とした相対量）を出す。
export function IndexTable({
  colA,
  colB,
  rows,
  neutralColor = "var(--wood)"
}: {
  colA: string;
  colB: string;
  rows: IndexTableRow[];
  neutralColor?: string;
}) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.count), 0) || 1;

  return (
    <div className="overflow-hidden rounded-[3px] border border-rule bg-panel shadow-lift">
      <div className="grid grid-cols-[20px_minmax(0,1fr)_90px] items-center gap-3.5 bg-board px-4 py-2.5 sm:grid-cols-[20px_minmax(0,1fr)_150px_90px]">
        <span />
        <span className="col-head-board">{colA}</span>
        <span className="col-head-board hidden sm:inline">stock</span>
        <span className="col-head-board text-right">{colB}</span>
      </div>

      {rows.map((row) => {
        const color = clampPerformerColor(row.colorCode) ?? neutralColor;

        return (
          <Link
            key={row.key}
            href={row.href}
            className="grid grid-cols-[20px_minmax(0,1fr)_90px] items-center gap-3.5 border-t border-rule px-4 py-2.5 transition-colors hover:bg-hover sm:grid-cols-[20px_minmax(0,1fr)_150px_90px]"
          >
            <span
              aria-hidden="true"
              className="h-8 w-5 rounded-[1px] shadow-spine"
              style={{ backgroundColor: color }}
            />
            <span className="min-w-0 truncate">
              <span className="text-sm font-bold text-ink">{row.name}</span>
              {row.sub ? (
                <span className="ml-2.5 text-xs text-[color:var(--slate-light)]">{row.sub}</span>
              ) : null}
            </span>
            {/* 在庫バー。最小 4% にして 0 件でも「棚がある」ことが分かるようにする。 */}
            <span
              aria-hidden="true"
              className="hidden h-1.5 overflow-hidden rounded-full bg-rule sm:block"
            >
              <span
                className="block h-full"
                style={{
                  width: `${Math.max(4, Math.round((row.count / max) * 100))}%`,
                  backgroundColor: color
                }}
              />
            </span>
            <span className="text-right font-mono text-[13px] tabular-nums text-slate">
              {row.count.toLocaleString("ja-JP")}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// インデックス系ページ共通の検索バー（什器の面に載せた1本の帯）。
export function IndexSearchBar({
  children,
  countLabel
}: {
  children: React.ReactNode;
  countLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2.5 rounded-[3px] border border-rule bg-panel p-4 shadow-lift">
      {children}
      <span className="ml-auto self-center font-mono text-[11px] tabular-nums text-slate">
        {countLabel}
      </span>
    </div>
  );
}
