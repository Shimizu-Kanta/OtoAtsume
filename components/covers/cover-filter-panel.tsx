import Link from "next/link";

import { TagGroupFilter } from "@/components/tag-group-filter";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { coverTypeOptions } from "@/lib/constants";
import type { listTagsGroupedForFilter } from "@/lib/data/tags";
import { cn } from "@/lib/utils";

type TagFilter = Awaited<ReturnType<typeof listTagsGroupedForFilter>>;

// レコード棚の「仕切り板（dividers）」に見立てた絞り込みパネル。
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

  return (
    <form
      action="/covers"
      className="overflow-hidden rounded-[3px] border border-rule bg-panel shadow-lift"
    >
      {view ? <input type="hidden" name="view" value={view} /> : null}

      <div className="bg-board px-3.5 py-2.5">
        <p className="eyebrow-board">dividers / filters</p>
      </div>

      <div className="flex flex-col gap-4 p-3.5">
        <FilterField label="song title" htmlFor="song">
          <Input
            id="song"
            name="song"
            defaultValue={search.song}
            placeholder="楽曲名"
            className="h-[38px] text-[13px]"
          />
        </FilterField>

        <FilterField label="performer" htmlFor="performer">
          <Input
            id="performer"
            name="performer"
            defaultValue={search.performer}
            placeholder="活動者名・別名"
            className="h-[38px] text-[13px]"
          />
        </FilterField>

        <FilterField label="original artist" htmlFor="artist">
          <Input
            id="artist"
            name="artist"
            defaultValue={search.artist}
            placeholder="原曲アーティスト名"
            className="h-[38px] text-[13px]"
          />
        </FilterField>

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

        <div className="grid grid-cols-2 gap-2">
          <FilterField label="from" htmlFor="dateFrom">
            <Input
              id="dateFrom"
              name="dateFrom"
              type="date"
              defaultValue={search.dateFrom}
              className="h-[38px] px-2 text-[13px]"
            />
          </FilterField>
          <FilterField label="to" htmlFor="dateTo">
            <Input
              id="dateTo"
              name="dateTo"
              type="date"
              defaultValue={search.dateTo}
              className="h-[38px] px-2 text-[13px]"
            />
          </FilterField>
        </div>

        <FilterField label="order" htmlFor="sort">
          <Select id="sort" name="sort" defaultValue={sort} className="h-[38px] text-[13px]">
            <option value="performedAtDesc">新譜（配信日が新しい順）</option>
            <option value="performedAtAsc">配信日が古い順</option>
            <option value="addedAtDesc">最新入荷（登録が新しい順）</option>
          </Select>
        </FilterField>

        {hasTags ? (
          <details className="border-t border-rule pt-3.5" open={selectedTagIds.length > 0}>
            <summary className="cursor-pointer select-none text-[13px] font-medium text-slate">
              タグで絞り込む
              {selectedTagIds.length > 0 ? (
                <span className="ml-1 text-stamp">（{selectedTagIds.length}件選択中）</span>
              ) : null}
            </summary>
            <div className="mt-3">
              <TagGroupFilter
                grouped={tagFilter.grouped}
                ungrouped={tagFilter.ungrouped}
                selectedTagIds={selectedTagIds}
              />
            </div>
          </details>
        ) : null}

        <button type="submit" className={cn(buttonVariants(), "h-[38px] w-full text-[13px]")}>
          この条件で棚を絞る
        </button>
        <Link
          href="/covers"
          className="text-center text-xs text-slate underline-offset-4 hover:text-ink hover:underline"
        >
          条件をクリア
        </Link>
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
