"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  importFormats,
  importTargets,
  type ImportActionState,
  type ImportFormat,
  type ImportRowAction,
  type ImportTarget
} from "@/lib/imports/types";
import { submitImportAction } from "./actions";

const targetLabels: Record<ImportTarget, string> = {
  performers: "Performers",
  groups: "Groups",
  artists: "Artists",
  songs: "Songs"
};

const formatLabels: Record<ImportFormat, string> = {
  json: "JSON",
  csv: "CSV"
};

const actionLabels: Record<ImportRowAction, string> = {
  create: "追加",
  update: "更新",
  skip: "スキップ",
  error: "エラー"
};

export function ImportForm({ initialState }: { initialState: ImportActionState }) {
  const [state, formAction, pending] = useActionState(submitImportAction, initialState);
  const [target, setTarget] = useState<ImportTarget>(state.input.target);
  const [format, setFormat] = useState<ImportFormat>(state.input.format);
  const [content, setContent] = useState(state.input.content);

  useEffect(() => {
    setTarget(state.input.target);
    setFormat(state.input.format);
    setContent(state.input.content);
  }, [state.input.content, state.input.format, state.input.target]);

  const canImport = useMemo(
    () =>
      state.status === "preview" &&
      state.summary?.errorCount === 0 &&
      state.input.target === target &&
      state.input.format === format &&
      state.input.content === content,
    [content, format, state, target]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setContent(text);
    if (file.name.toLowerCase().endsWith(".csv")) {
      setFormat("csv");
    } else if (file.name.toLowerCase().endsWith(".json")) {
      setFormat("json");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-md border bg-card p-5">
        <div className="form-grid">
          <div className="space-y-2">
            <Label htmlFor="target">対象</Label>
            <Select
              id="target"
              name="target"
              value={target}
              onChange={(event) => setTarget(event.currentTarget.value as ImportTarget)}
            >
              {importTargets.map((item) => (
                <option key={item} value={item}>
                  {targetLabels[item]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="format">形式</Label>
            <Select
              id="format"
              name="format"
              value={format}
              onChange={(event) => setFormat(event.currentTarget.value as ImportFormat)}
            >
              {importFormats.map((item) => (
                <option key={item} value={item}>
                  {formatLabels[item]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">ファイル</Label>
            <Input id="file" type="file" accept=".csv,.json,text/csv,application/json" onChange={handleFileChange} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="content">インポート内容</Label>
          <Textarea
            id="content"
            name="content"
            value={content}
            onChange={(event) => setContent(event.currentTarget.value)}
            className="min-h-80 font-mono text-xs leading-relaxed"
            placeholder={
              format === "csv"
                ? "name,groupName,youtubeUrl,officialUrl,colorCode,debutDate,birthday,tags,aliases,status"
                : "[\n  {}\n]"
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit" name="intent" value="preview" variant="outline" disabled={pending}>
            プレビュー
          </Button>
          <Button type="submit" name="intent" value="import" disabled={pending || !canImport}>
            インポート実行
          </Button>
        </div>
      </form>

      {state.message ? (
        <p className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {state.message}
        </p>
      ) : null}

      {state.summary ? (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryItem label="総行数" value={state.summary.totalRows} />
            <SummaryItem label="追加予定" value={state.summary.createCount} />
            <SummaryItem label="更新予定" value={state.summary.updateCount} />
            <SummaryItem label="スキップ" value={state.summary.skipCount} />
            <SummaryItem label="エラー" value={state.summary.errorCount} tone={state.summary.errorCount > 0 ? "danger" : "default"} />
          </div>

          {state.rows.length > 0 ? (
            <div className="overflow-hidden rounded-md border bg-card">
              <div className="grid grid-cols-[72px_96px_1fr] gap-3 border-b bg-muted/40 px-4 py-3 text-sm font-medium">
                <span>行</span>
                <span>判定</span>
                <span>内容</span>
              </div>
              <div className="max-h-96 divide-y overflow-auto">
                {state.rows.map((row) => (
                  <div key={`${row.rowNumber}-${row.name}-${row.action}`} className="grid grid-cols-[72px_96px_1fr] gap-3 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">{row.rowNumber === 0 ? "-" : row.rowNumber}</span>
                    <span className={row.action === "error" ? "font-medium text-destructive" : ""}>
                      {actionLabels[row.action]}
                    </span>
                    <div>
                      <p className="font-medium">{row.name}</p>
                      {row.errors.length > 0 ? (
                        <ul className="mt-1 space-y-1 text-destructive">
                          {row.errors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {state.result ? (
        <section className="space-y-4 rounded-md border bg-card p-5">
          <h2 className="text-lg font-semibold">実行結果</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="created" value={state.result.createdCount} />
            <SummaryItem label="updated" value={state.result.updatedCount} />
            <SummaryItem label="skipped" value={state.result.skippedCount} />
            <SummaryItem label="failed" value={state.result.failedCount} tone={state.result.failedCount > 0 ? "danger" : "default"} />
          </div>
          {state.result.names.length > 0 ? (
            <div>
              <p className="text-sm font-medium">追加・更新されたレコード</p>
              <p className="mt-2 text-sm text-muted-foreground">{state.result.names.slice(0, 20).join(", ")}</p>
            </div>
          ) : null}
          {state.result.errors.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-destructive">エラー行</p>
              <ul className="mt-2 space-y-1 text-sm text-destructive">
                {state.result.errors.map((row) => (
                  <li key={`${row.rowNumber}-${row.name}`}>{row.errors.join(", ")}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={tone === "danger" ? "mt-2 text-2xl font-semibold text-destructive" : "mt-2 text-2xl font-semibold"}>
        {value}
      </p>
    </div>
  );
}
