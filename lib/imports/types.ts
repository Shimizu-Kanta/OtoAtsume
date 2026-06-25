export const importTargets = ["performers", "groups", "artists", "songs"] as const;
export type ImportTarget = (typeof importTargets)[number];

export const importFormats = ["json", "csv"] as const;
export type ImportFormat = (typeof importFormats)[number];

export const maxImportRows = 500;

export type ImportInput = {
  target: ImportTarget;
  format: ImportFormat;
  content: string;
};

export type ImportRowAction = "create" | "update" | "skip" | "error";

export type ImportRowPreview = {
  rowNumber: number;
  name: string;
  action: ImportRowAction;
  errors: string[];
};

export type ImportSummary = {
  totalRows: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  errorCount: number;
};

export type ImportExecutionResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  names: string[];
  errors: ImportRowPreview[];
};

export type ImportActionState = {
  status: "idle" | "preview" | "imported" | "error";
  message?: string;
  input: ImportInput;
  previewKey?: string;
  summary?: ImportSummary;
  rows: ImportRowPreview[];
  result?: ImportExecutionResult;
};
