import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import Database from "better-sqlite3";

type TagRow = {
  id: number;
  name: string;
  sort_order: number;
};

const D1_LOCAL_DB_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const SORT_ORDER_STEP = 10;

function printUsage() {
  console.log(`Usage:
  pnpm tags:list
  pnpm tags:add <tagName1> [tagName2] ...
`);
}

function resolveLocalDbPath() {
  const dbDir = resolve(process.cwd(), D1_LOCAL_DB_DIR);
  if (!existsSync(dbDir)) {
    throw new Error(
      `ローカルD1の保存先が見つかりません: ${dbDir}
先に backend を起動するか、migration を適用してください。`,
    );
  }

  const sqliteFiles = readdirSync(dbDir)
    .filter((fileName) => fileName.endsWith(".sqlite"))
    .map((fileName) => ({
      fileName,
      fullPath: join(dbDir, fileName),
      mtimeMs: statSync(join(dbDir, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (sqliteFiles.length === 0) {
    throw new Error(
      `ローカルD1のSQLiteファイルが見つかりません: ${dbDir}
先に backend を起動するか、migration を適用してください。`,
    );
  }

  return sqliteFiles[0].fullPath;
}

function listTags(db: Database.Database) {
  const rows = db
    .prepare("SELECT id, name, sort_order FROM tags ORDER BY sort_order ASC, id ASC")
    .all() as TagRow[];

  if (rows.length === 0) {
    console.log("タグはまだ登録されていません。");
    return;
  }

  console.log("id\torder\tname");
  for (const row of rows) {
    console.log(`${row.id}\t${row.sort_order}\t${row.name}`);
  }
}

function addTags(db: Database.Database, rawNames: string[]) {
  const names = [...new Set(rawNames.map((name) => name.trim()).filter(Boolean))];

  if (names.length === 0) {
    throw new Error("追加するタグ名が空です。");
  }

  const currentMaxSortOrderRow = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order FROM tags")
    .get() as { max_sort_order: number };
  let nextSortOrder = currentMaxSortOrderRow.max_sort_order;

  const findByNameStmt = db.prepare("SELECT id FROM tags WHERE name = ?");
  const insertTagStmt = db.prepare(
    "INSERT INTO tags (name, sort_order) VALUES (?, ?)",
  );

  const inserted: Array<{ id: number; name: string; sort_order: number }> = [];
  const skipped: string[] = [];

  const transaction = db.transaction(() => {
    for (const name of names) {
      const existing = findByNameStmt.get(name) as { id: number } | undefined;
      if (existing) {
        skipped.push(name);
        continue;
      }

      nextSortOrder += SORT_ORDER_STEP;
      const result = insertTagStmt.run(name, nextSortOrder);
      inserted.push({
        id: Number(result.lastInsertRowid),
        name,
        sort_order: nextSortOrder,
      });
    }
  });

  transaction();

  if (inserted.length > 0) {
    console.log("追加したタグ:");
    for (const row of inserted) {
      console.log(`- id=${row.id}, order=${row.sort_order}, name=${row.name}`);
    }
  } else {
    console.log("追加されたタグはありません。");
  }

  if (skipped.length > 0) {
    console.log(`既に存在するためスキップ: ${skipped.join(", ")}`);
  }
}

function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  let db: Database.Database | null = null;
  try {
    const localDbPath = resolveLocalDbPath();
    db = new Database(localDbPath);

    if (command === "list") {
      listTags(db);
      return;
    }

    if (command === "add") {
      addTags(db, args);
      return;
    }

    throw new Error(`未知のコマンドです: ${command}`);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = rawMessage.includes("no such table: tags")
      ? `${rawMessage}
先に migration を適用してください（例: pnpm local:migration）。`
      : rawMessage;

    console.error(`❌ ${message}`);
    printUsage();
    process.exit(1);
  } finally {
    db?.close();
  }
}

main();
