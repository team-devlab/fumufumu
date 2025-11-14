// 💡 Drizzle StudioやローカルDB接続に使用するファイルパス。
// 🚨 注意: この設定はローカル開発ツール（drizzle-kit）専用であり、
// Cloudflare WorkersのデプロイやリモートのD1データベースには影響しません。

import { defineConfig } from "drizzle-kit";

const DB_FILE_PATH = './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/390251f9042a6eeca3249468e2dcce0fba1d1e8e4befe411979c8f7b0e66446b.sqlite';

export default defineConfig({
	dialect: "sqlite",
	schema: "./src/db/schema",
	out: "./drizzle",
	dbCredentials: {
    url: DB_FILE_PATH,
  },
});
