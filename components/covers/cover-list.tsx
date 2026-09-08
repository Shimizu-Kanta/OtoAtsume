import { CoverListRow, LEDGER_GRID } from "@/components/covers/cover-list-row";
import type { CoverListItem } from "@/lib/data/covers";

export function CoverList({ covers }: { covers: CoverListItem[] }) {
  if (covers.length === 0) {
    return (
      <div className="rounded-[3px] border border-rule bg-panel p-6 text-sm text-slate shadow-lift">
        条件に一致する歌唱記録はありません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[3px] border border-rule bg-panel shadow-lift">
      {/* 台帳の見出しは黒板。データを俯瞰する一覧のカラムヘッダーは英語・大文字・mono */}
      <div className={`${LEDGER_GRID} bg-board px-3.5 py-2.5`}>
        <span />
        <span className="col-head-board">track</span>
        <span className="col-head-board">performer</span>
        <span className="col-head-board">type</span>
        <span className="col-head-board text-right">date</span>
      </div>
      <div>
        {covers.map((cover) => (
          <CoverListRow key={cover.id} cover={cover} />
        ))}
      </div>
    </div>
  );
}
