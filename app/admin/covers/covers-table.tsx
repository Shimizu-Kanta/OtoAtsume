"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";

import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { AdminEmptyRow, AdminTable, AdminTd, AdminTh, AdminTr } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bulkUpdateCoverStatusAction, deleteCoverAction } from "./actions";
import { CoverStatusSelect } from "./status-select";

export type AdminCoverRow = {
  id: string;
  songTitle: string;
  artistNames: string;
  performerNames: string;
  performedAt: string;
  coverTypeLabel: string;
  status: string;
  sourceUrl: string;
  sourceHost: string;
};

const bulkActions = [
  { status: "APPROVED", label: "公開にする", statusLabel: "公開" },
  { status: "PENDING", label: "保留にする", statusLabel: "確認待ち" },
  { status: "HIDDEN", label: "非表示にする", statusLabel: "非表示" }
] as const;

// 歌唱記録一覧の表。行の選択状態を持ち、1 件以上選ぶと画面下に一括操作のバーを出す。
// 全選択はこのページに表示中の行だけが対象。
export function CoversTable({ rows, returnQuery }: { rows: AdminCoverRow[]; returnQuery: string }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const bulkSubmittedRef = useRef(false);
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);

  // ページ移動・絞り込みで行が入れ替わったら、見えなくなった行の選択は外す。
  // 一括変更を送信したあとに新しい一覧が届いたときは、選択をすべて解除する。
  useEffect(() => {
    if (bulkSubmittedRef.current) {
      bulkSubmittedRef.current = false;
      setSelected(new Set());
      return;
    }

    setSelected((current) => {
      const next = new Set(rowIds.filter((id) => current.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [rowIds]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rowIds));
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className={selected.size > 0 ? "pb-20" : undefined}>
      <AdminTable>
        <thead>
          <tr>
            <AdminTh className="w-10">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                className="size-4 align-middle accent-[hsl(var(--primary))]"
                checked={allSelected}
                onChange={toggleAll}
                disabled={rows.length === 0}
                aria-label="このページの歌唱記録をすべて選択"
              />
            </AdminTh>
            <AdminTh>楽曲</AdminTh>
            <AdminTh>活動者</AdminTh>
            <AdminTh className="hidden lg:table-cell">歌唱日</AdminTh>
            <AdminTh className="hidden lg:table-cell">種別</AdminTh>
            <AdminTh>状態</AdminTh>
            <AdminTh className="hidden lg:table-cell">情報元</AdminTh>
            <AdminTh className="text-right">操作</AdminTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const checked = selected.has(row.id);

            return (
              <AdminTr key={row.id} className={checked ? "bg-primary/5" : undefined}>
                <AdminTd>
                  <input
                    type="checkbox"
                    className="size-4 align-middle accent-[hsl(var(--primary))]"
                    checked={checked}
                    onChange={() => toggle(row.id)}
                    aria-label={`「${row.songTitle}」を選択`}
                  />
                </AdminTd>
                <AdminTd className="min-w-[12rem]">
                  <Link href={`/admin/covers/${row.id}`} className="font-bold text-foreground hover:text-primary hover:underline">
                    {row.songTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground">{row.artistNames || "—"}</p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground lg:hidden">
                    {row.performedAt} ・ {row.coverTypeLabel}
                  </p>
                </AdminTd>
                <AdminTd className="max-w-[14rem]">
                  <span className="block truncate" title={row.performerNames}>
                    {row.performerNames}
                  </span>
                </AdminTd>
                <AdminTd className="hidden whitespace-nowrap font-mono tabular-nums lg:table-cell">
                  {row.performedAt}
                </AdminTd>
                <AdminTd className="hidden whitespace-nowrap lg:table-cell">
                  <Badge variant="muted">{row.coverTypeLabel}</Badge>
                </AdminTd>
                <AdminTd>
                  <CoverStatusSelect id={row.id} status={row.status} label={row.songTitle} />
                </AdminTd>
                <AdminTd className="hidden lg:table-cell">
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={row.sourceUrl}
                    className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline"
                  >
                    {row.sourceHost}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </AdminTd>
                <AdminTd>
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <Link
                      href={`/admin/covers/${row.id}`}
                      className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      編集
                    </Link>
                    <a
                      href={`/covers/${row.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      公開↗
                    </a>
                    <form action={deleteCoverAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <DeleteSubmitButton
                        size="sm"
                        className="size-8 px-0"
                        aria-label={`「${row.songTitle}」を削除`}
                        title="削除"
                        confirmMessage={`歌唱記録「${row.songTitle}」を削除します。関連する通報も削除されます。よろしいですか？`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </DeleteSubmitButton>
                    </form>
                  </div>
                </AdminTd>
              </AdminTr>
            );
          })}
          {rows.length === 0 ? <AdminEmptyRow colSpan={8}>条件に合う歌唱記録はありません</AdminEmptyRow> : null}
        </tbody>
      </AdminTable>

      {selected.size > 0 ? (
        <form
          action={bulkUpdateCoverStatusAction}
          onSubmit={() => {
            bulkSubmittedRef.current = true;
          }}
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:left-[232px]"
          aria-label="選択した歌唱記録の一括操作"
        >
          {Array.from(selected).map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <input type="hidden" name="returnQuery" value={returnQuery} />
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <p className="mr-2 text-sm font-semibold tabular-nums" aria-live="polite">
              {selected.size} 件選択中
            </p>
            {bulkActions.map((action) => (
              <Button
                key={action.status}
                type="submit"
                name="status"
                value={action.status}
                size="sm"
                variant={action.status === "APPROVED" ? "default" : "secondary"}
                onClick={(event) => {
                  if (!window.confirm(`${selected.size} 件を「${action.statusLabel}」にします。よろしいですか？`)) {
                    event.preventDefault();
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              選択を解除
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
