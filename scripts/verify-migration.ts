// Cloud SQL（移行元）と Supabase（移行先）の public スキーマを読み取り専用で比較する。
// - 全テーブルの行数
// - covers / performers / songs の最新 createdAt・updatedAt
// - id を持つテーブルで、片方にしかない行と updatedAt が食い違う行
//   （ダンプ後に旧 DB へ入った登録や、ロールバック時に Supabase にしかない登録の洗い出し用）
// - _prisma_migrations の適用済み migration
//
//   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... pnpm tsx scripts/verify-migration.ts
//
// TARGET_DATABASE_URL を省略した場合は DIRECT_URL を使う。差分があれば終了コード 1 で終わる。
import { PrismaClient } from "@prisma/client";

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DIRECT_URL;
const DETAIL_TABLES = ["covers", "performers", "songs"];
const MAX_LISTED_IDS = 20;

type TableInfo = { name: string; hasId: boolean; hasCreatedAt: boolean; hasUpdatedAt: boolean };

async function listTables(db: PrismaClient): Promise<Map<string, TableInfo>> {
  const rows = await db.$queryRaw<{ table_name: string; columns: string[] }[]>`
    SELECT t.table_name, array_agg(c.column_name::text) AS columns
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
  `;

  return new Map(
    rows.map((row) => [
      row.table_name,
      {
        name: row.table_name,
        hasId: row.columns.includes("id"),
        hasCreatedAt: row.columns.includes("createdAt"),
        hasUpdatedAt: row.columns.includes("updatedAt")
      }
    ])
  );
}

async function countRows(db: PrismaClient, table: string): Promise<number> {
  const [row] = await db.$queryRawUnsafe<{ count: bigint }[]>(`SELECT count(*) AS count FROM "${table}"`);
  return Number(row.count);
}

async function latestTimestamps(db: PrismaClient, table: TableInfo) {
  const createdAt = table.hasCreatedAt ? `max("createdAt")` : "NULL";
  const updatedAt = table.hasUpdatedAt ? `max("updatedAt")` : "NULL";
  const [row] = await db.$queryRawUnsafe<{ created_at: Date | null; updated_at: Date | null }[]>(
    `SELECT ${createdAt} AS created_at, ${updatedAt} AS updated_at FROM "${table.name}"`
  );
  return row;
}

// id → updatedAt（updatedAt 列がなければ null）
async function idVersions(db: PrismaClient, table: TableInfo): Promise<Map<string, string | null>> {
  const updatedAt = table.hasUpdatedAt ? `"updatedAt"` : "NULL";
  const rows = await db.$queryRawUnsafe<{ id: string; updated_at: Date | null }[]>(
    `SELECT id::text AS id, ${updatedAt} AS updated_at FROM "${table.name}"`
  );
  return new Map(rows.map((row) => [row.id, row.updated_at?.toISOString() ?? null]));
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "-";
}

function listIds(label: string, ids: string[]) {
  if (ids.length === 0) return;
  const shown = ids.slice(0, MAX_LISTED_IDS).join(", ");
  const rest = ids.length > MAX_LISTED_IDS ? ` …ほか ${ids.length - MAX_LISTED_IDS} 件` : "";
  console.log(`    ${label} ${ids.length} 件: ${shown}${rest}`);
}

async function main() {
  if (!SOURCE_URL || !TARGET_URL) {
    throw new Error("SOURCE_DATABASE_URL と TARGET_DATABASE_URL（または DIRECT_URL）を指定してください。");
  }

  const source = new PrismaClient({ datasourceUrl: SOURCE_URL });
  const target = new PrismaClient({ datasourceUrl: TARGET_URL });
  let hasDiff = false;

  try {
    const [sourceTables, targetTables] = await Promise.all([listTables(source), listTables(target)]);
    const tableNames = [...new Set([...sourceTables.keys(), ...targetTables.keys()])].sort();

    console.log("## 行数");
    // _prisma_migrations は移行後に足した migration の分だけ移行先が多くなるため、末尾の専用チェックで比較する。
    for (const name of tableNames.filter((table) => table !== "_prisma_migrations")) {
      const inSource = sourceTables.has(name);
      const inTarget = targetTables.has(name);
      if (!inSource || !inTarget) {
        hasDiff = true;
        console.log(`✗ ${name}: ${inSource ? "移行先にテーブルがない" : "移行元にテーブルがない"}`);
        continue;
      }
      const [sourceCount, targetCount] = await Promise.all([countRows(source, name), countRows(target, name)]);
      const ok = sourceCount === targetCount;
      if (!ok) hasDiff = true;
      console.log(`${ok ? "✓" : "✗"} ${name}: 移行元 ${sourceCount} / 移行先 ${targetCount}`);
    }

    console.log("\n## 最新の createdAt / updatedAt");
    for (const name of DETAIL_TABLES) {
      const sourceTable = sourceTables.get(name);
      const targetTable = targetTables.get(name);
      if (!sourceTable || !targetTable) continue;
      const [s, t] = await Promise.all([latestTimestamps(source, sourceTable), latestTimestamps(target, targetTable)]);
      const ok = formatDate(s.created_at) === formatDate(t.created_at) && formatDate(s.updated_at) === formatDate(t.updated_at);
      if (!ok) hasDiff = true;
      console.log(`${ok ? "✓" : "✗"} ${name}`);
      console.log(`    createdAt: 移行元 ${formatDate(s.created_at)} / 移行先 ${formatDate(t.created_at)}`);
      console.log(`    updatedAt: 移行元 ${formatDate(s.updated_at)} / 移行先 ${formatDate(t.updated_at)}`);
    }

    console.log("\n## 行単位の差分（id を持つテーブル）");
    let rowDiffFound = false;
    for (const name of tableNames) {
      const sourceTable = sourceTables.get(name);
      const targetTable = targetTables.get(name);
      if (!sourceTable?.hasId || !targetTable?.hasId || name === "_prisma_migrations") continue;

      const [s, t] = await Promise.all([idVersions(source, sourceTable), idVersions(target, targetTable)]);
      const onlySource = [...s.keys()].filter((id) => !t.has(id));
      const onlyTarget = [...t.keys()].filter((id) => !s.has(id));
      const changed = [...s.keys()].filter((id) => t.has(id) && s.get(id) !== t.get(id));
      if (onlySource.length + onlyTarget.length + changed.length === 0) continue;

      rowDiffFound = true;
      hasDiff = true;
      console.log(`✗ ${name}`);
      listIds("移行元にだけある", onlySource);
      listIds("移行先にだけある", onlyTarget);
      listIds("updatedAt が異なる", changed);
    }
    if (!rowDiffFound) console.log("✓ 差分なし");

    console.log("\n## _prisma_migrations");
    const migrationQuery = `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
    if (sourceTables.has("_prisma_migrations") && targetTables.has("_prisma_migrations")) {
      const [s, t] = await Promise.all([
        source.$queryRawUnsafe<{ migration_name: string }[]>(migrationQuery),
        target.$queryRawUnsafe<{ migration_name: string }[]>(migrationQuery)
      ]);
      // 移行先にだけある migration（RLS 有効化など移行後に足したもの）は差分扱いしない。
      const targetNames = new Set(t.map((row) => row.migration_name));
      const sourceNames = new Set(s.map((row) => row.migration_name));
      const missing = s.map((row) => row.migration_name).filter((name) => !targetNames.has(name));
      const extra = t.map((row) => row.migration_name).filter((name) => !sourceNames.has(name));
      const ok = missing.length === 0;
      if (!ok) hasDiff = true;
      console.log(`${ok ? "✓" : "✗"} 適用済み: 移行元 ${s.length} 件 / 移行先 ${t.length} 件`);
      listIds("移行先に未適用", missing);
      listIds("移行先にだけある", extra);
    } else {
      hasDiff = true;
      console.log("✗ どちらかに _prisma_migrations がない");
    }
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }

  console.log(hasDiff ? "\n差分あり" : "\n一致");
  process.exitCode = hasDiff ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
