// 💡 Drizzle StudioやローカルDB接続に使用するファイルパス。
// 🚨 注意: この設定はローカル開発ツール（drizzle-kit）専用であり、
// Cloudflare WorkersのデプロイやリモートのD1データベースには影響しません。

import { existsSync, readFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

const D1_LOCAL_DB_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const D1_OBJECT_UNIQUE_KEY = "miniflare-D1DatabaseObject";
const DEFAULT_WRANGLER_CONFIG = "wrangler.local.jsonc";

type WranglerD1Config = {
  d1_databases?: Array<{
    binding?: string;
    database_id?: string;
  }>;
};

function stripJsoncComments(raw: string) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1");
}

function getWranglerConfigPath() {
  const config = process.env.WRANGLER_DEV_CONFIG
    ?? process.env.WRANGLER_D1_CONFIG
    ?? DEFAULT_WRANGLER_CONFIG;
  return resolve(process.cwd(), config);
}

function readDatabaseIdFromWranglerConfig() {
  const wranglerConfigPath = getWranglerConfigPath();

  if (!existsSync(wranglerConfigPath)) {
    throw new Error(
      `Wrangler config not found: ${wranglerConfigPath}\n` +
      "Set WRANGLER_DEV_CONFIG or WRANGLER_D1_CONFIG, or create wrangler.local.jsonc.",
    );
  }

  const raw = readFileSync(wranglerConfigPath, "utf8");
  const parsed = JSON.parse(stripJsoncComments(raw)) as WranglerD1Config;
  const d1 =
    parsed.d1_databases?.find((db) => db.binding === "DB")
    ?? parsed.d1_databases?.[0];
  const databaseId = d1?.database_id;

  if (!databaseId) {
    throw new Error(
      `database_id for binding "DB" is missing in ${wranglerConfigPath}`,
    );
  }

  if (databaseId.startsWith("YOUR_")) {
    throw new Error(
      `database_id in ${wranglerConfigPath} is a placeholder: ${databaseId}`,
    );
  }

  return databaseId;
}

function resolveLocalD1FilePath(databaseId: string) {
  // MiniflareのD1ファイル名は database_id から Durable Object ID と同じ手順で導出される。
  const key = createHash("sha256").update(D1_OBJECT_UNIQUE_KEY).digest();
  const nameHmac = createHmac("sha256", key).update(databaseId).digest().subarray(0, 16);
  const hmac = createHmac("sha256", key).update(nameHmac).digest().subarray(0, 16);
  const fileName = `${Buffer.concat([nameHmac, hmac]).toString("hex")}.sqlite`;

  const fullPath = resolve(process.cwd(), D1_LOCAL_DB_DIR, fileName);
  if (!existsSync(fullPath)) {
    throw new Error(
      `Local D1 file not found: ${fullPath}\n` +
      "Run `pnpm dev` once (or apply local migrations) so the local D1 file is created.",
    );
  }
  return fullPath;
}

const databaseId = readDatabaseIdFromWranglerConfig();
const DB_FILE_PATH = resolveLocalD1FilePath(databaseId);

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url: DB_FILE_PATH,
  },
});
