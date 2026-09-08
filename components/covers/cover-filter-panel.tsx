import Link from "next/link";

import { TagGroupFilter } from "@/components/tag-group-filter";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { coverTypeOptions } from "@/lib/constants";
import type { listTagsGroupedForFilter } from "@/lib/data/tags";
import { cn } from "@/lib/utils";

type TagFilter = Awaited<ReturnType<typeof listTagsGroupedForFilter>>;

const DEFAULT_SORT = "performedAtDesc";

// レコード棚の「仕切り板（dividers）」に見立てた絞り込みパネル。
// よく使う3項目だけを常に見せ、それ以外は畳んでおく。全部を開いたままにすると
// パネルだけで1画面を使ってしまい、検索結果が折り返しの下に隠れるため。
//
// 歌唱種別はチップ形状のラジオで表す。peer-checked で見た目を切り替えるので
// クライアント JS 無しでも選択状態が保たれる（フォームは素の GET のまま）。
export function CoverFilterPanel({
  search,
  sort,
  selectedTagIds,
  tagFilter,
  view
}: {
  search: {
    performer?: string;
    song?: string;
    artist?: string;
    dateFrom?: string;
    dateTo?: string;
    coverType?: string;
  };
  sort: string;
  selectedTagIds: string[];
  tagFilter: TagFilter;
  view?: string;
}) {
  const hasTags =
    tagFilter.grouped.some((group) => group.tags.length > 0) || tagFilter.ungrouped.length > 0;
  const typeChoices = [{ value: "", label: "すべて" }, ...coverTypeOptions];

  // 畳んだ側に条件が入っているまま閉じていると、何で絞られているのか分からなくなる。
  // 1つでも指定されていれば開いた状態で描画する。
  const hasAdvancedFilter =
    Boolean(search.coverType) ||
    Boolean(search.dateFrom) ||
    Boolean(search.dateTo) ||
    sort !== DEFAULT_SORT ||
    selectedTagIds.length > 0;

  return (
    <form
      action="/covers"
      className="overflow-hidden rounded-[3px] border border-rule bg-panel shadow-lift"
    >
      {view ? <input type="hidden" name="view" value={view} /> : null}

      <div className="bg-board px-4 py-2.5">
        <p className="eyebrow-board">dividers / filters</p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <FilterField label="song title" htmlFor="song">
            <Input id="song" name="song" defaultValue={search.song} placeholder="楽曲名" />
          </FilterField>

          <FilterField label="performer" htmlFor="performer">
            <Input
              id="performer"
              name="performer"
              defaultValue={search.performer}
              placeholder="活動者名・別名"
            />
          </FilterField>

          <FilterField label="original artist" htmlFor="artist">
            <Input
              id="artist"
              name="artist"
              defaultValue={search.artist}
              placeholder="原曲アーティスト名"
            />
          </FilterField>
        </div>

        <details className="border-t border-rule pt-3" open={hasAdvancedFilter}>
          <summary className="cursor-pointer select-none text-[13px] font-semibold text-slate">
            種別・期間・並び順で絞る
            {hasAdvancedFilter ? <span className="ml-1.5 text-stamp">（適用中）</span> : null}
          </summary>

          <div className="mt-4 flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="eyebrow-muted">type</legend>
              <div className="flex flex-wrap gap-1.5">
                {typeChoices.map((option) => (
                  <label
                    key={option.value || "all"}
                    className="cursor-pointer"
                    title={`歌唱種別: ${option.label}`}
                  >
                    <input
                      type="radio"
                      name="coverType"
                      value={option.value}
                      defaultChecked={(search.coverType ?? "") === option.value}
                      className="peer sr-only"
                    />
                    <span className="divider-tab inline-flex border border-rule bg-panel-2 px-2.5 py-1 text-[11px] font-semibold text-slate transition-colors peer-checked:border-board peer-checked:bg-board peer-checked:text-board-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-3">
              <FilterField label="from" htmlFor="dateFrom">
                <Input id="dateFrom" name="dateFrom" type="date" defaultValue={search.dateFrom} />
              </FilterField>
              <FilterField label="to" htmlFor="dateTo">
                <Input id="dateTo" name="dateTo" type="date" defaultValue={search.dateTo} />
              </FilterField>
              <FilterField label="order" htmlFor="sort">
                <Select id="sort" name="sort" defaultValue={sort}>
                  <option value="performedAtDesc">新譜（配信日が新しい順）</option>
                  <option value="performedAtAsc">配信日が古い順</option>
                  <option value="addedAtDesc">最新入荷（登録が新しい順）</option>
                </Select>
              </FilterField>
            </div>

            {hasTags ? (
              <div className="flex flex-col gap-2">
                <p className="eyebrow-muted">tags</p>
                <TagGroupFilter
                  grouped={tagFilter.grouped}
                  ungrouped={tagFilter.ungrouped}
                  selectedTagIds={selectedTagIds}
                />
              </div>
            ) : null}
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={cn(buttonVariants(), "h-[42px] px-6")}>
            この条件で棚を絞る
          </button>
          <Link
            href="/covers"
            className="text-[13px] text-slate underline-offset-4 hover:text-ink hover:underline"
          >
            条件をクリア
          </Link>
        </div>
      </div>
    </form>
  );
}

function FilterField({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className="eyebrow-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
