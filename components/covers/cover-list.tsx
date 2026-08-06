import { CoverListRow } from "@/components/covers/cover-list-row";
import type { CoverListItem } from "@/lib/data/covers";

export function CoverList({ covers }: { covers: CoverListItem[] }) {
  if (covers.length === 0) {
    return (
      <div className="rounded-[4px] border border-rule bg-panel p-6 text-sm text-slate">
        条件に一致する歌唱記録はありません。
      </div>
    );
  }

  return (
    // 画面が狭い場合は縦積みに変換せず、テーブル全体を横スクロールで見せる（列比率を維持）。
    <div className="overflow-x-auto">
      <div className="min-w-[560px] overflow-hidden rounded-[4px] border border-rule bg-panel">
        {/* データを俯瞰する一覧のカラムヘッダーは英語・大文字・mono */}
        <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule px-3 py-2">
          <span />
          <span className="col-head">TRACK</span>
          <span className="flex items-center gap-3">
            <span className="col-head">TYPE</span>
            <span className="col-head w-[5.5rem] text-right">DATE</span>
          </span>
        </div>
        <div className="divide-y divide-rule">
          {covers.map((cover) => (
            <CoverListRow key={cover.id} cover={cover} />
          ))}
        </div>
      </div>
    </div>
  );
}
