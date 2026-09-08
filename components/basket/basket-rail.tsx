"use client";

import { BasketPanel } from "@/components/basket/basket-panel";

// PC（lg 以上）の右レール。
// position: fixed は使わない。フッター付近の広告ユニットと重なる可能性があるため、
// レイアウトの1カラムとして流れに置き、sticky でヘッダー下に貼り付ける。
export function BasketRail() {
  return (
    <aside
      aria-label="CDかご"
      className="hidden lg:sticky lg:top-4 lg:block lg:w-[220px] lg:self-start"
    >
      <div className="rounded-[3px] border border-rule bg-panel p-3 shadow-lift">
        <BasketPanel />
      </div>
    </aside>
  );
}
