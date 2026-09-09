"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";

import { useBasket } from "@/lib/basket/context";
import { cn } from "@/lib/utils";

// かごに入れるボタン。CDかごは「歌唱記録（曲）」を集める機能なので、
// カバーのカードと詳細ページにだけ置く。活動者・楽曲を見張る入荷ベルとは別物。
export function AddToBasketButton({
  coverIds,
  // 複数曲入りの一枚で、代表1曲しか手元に無い場合に渡す。
  // このIDから収録曲すべてを取り直してからかごに入れる。
  expandVideoId,
  label,
  addedLabel = "かごから出す",
  // "any": 1曲でも入っていれば「入っている」扱い（単曲ボタン向け）
  // "all": 全部入っているときだけ「入っている」扱い（まとめて入れるボタン向け。
  //        一部だけ入っている状態から残りを足せるようにするため）
  matchMode = "any",
  variant = "icon",
  className
}: {
  coverIds: string[];
  expandVideoId?: string | null;
  label: string;
  addedLabel?: string;
  matchMode?: "any" | "all";
  variant?: "icon" | "button";
  className?: string;
}) {
  const basket = useBasket();
  const [pending, setPending] = useState(false);
  // 失敗の文言はトースト（BasketProvider）が出す。button 版だけは
  // ボタン直下にも出して、押した場所で理由が分かるようにする。
  const [error, setError] = useState<string | null>(null);

  const inBasket =
    coverIds.length > 0 &&
    (matchMode === "all"
      ? coverIds.every((id) => basket.ids.has(id))
      : coverIds.some((id) => basket.ids.has(id)));

  async function handleClick() {
    setError(null);

    if (inBasket) {
      for (const id of coverIds) {
        basket.remove(id);
      }
      return;
    }

    let ids = coverIds;

    // アルバムを1枚かごに入れれば中身は全曲、という比喩に合わせる。
    // 棚のカードは代表1曲しか持っていないため、ここで全曲に展開する。
    if (expandVideoId) {
      setPending(true);
      try {
        const response = await fetch(`/api/basket/expand?videoId=${encodeURIComponent(expandVideoId)}`);
        if (response.ok) {
          const data = (await response.json()) as { ids: string[] };
          if (data.ids.length > 0) {
            ids = data.ids;
          }
        }
      } catch {
        // 展開に失敗しても、手元にある代表1曲だけは入れる（何も起きないより良い）。
      } finally {
        setPending(false);
      }
    }

    const result = basket.add(ids);

    if (!result.ok) {
      setError(result.error ?? "かごに入れられませんでした。");
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={inBasket}
        aria-label={inBasket ? addedLabel : label}
        title={error ?? (inBasket ? addedLabel : label)}
        // 追加済み・未追加で要素も位置も同じにし、アイコンと配色だけを差し替える
        // （条件分岐で別要素を出すと位置指定が二重管理になりズレが再発する）。
        // 170px のジャケットで邪魔にならないよう 24px 角に抑える。
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
          inBasket
            ? "bg-stamp text-white hover:brightness-110"
            : "bg-board/80 text-board-ink hover:bg-board",
          className
        )}
      >
        {inBasket ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <ShoppingCart className="size-4" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={inBasket}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-[2px] px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60",
          inBasket
            ? "border border-rule bg-panel text-ink hover:bg-hover"
            : "press-button bg-stamp text-white shadow-press hover:brightness-110",
          className
        )}
      >
        {inBasket ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <ShoppingCart className="size-4" aria-hidden="true" />
        )}
        {inBasket ? addedLabel : label}
      </button>
      {error ? <span className="text-xs text-[color:var(--error)]">{error}</span> : null}
    </span>
  );
}
