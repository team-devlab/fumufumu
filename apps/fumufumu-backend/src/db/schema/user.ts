import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { authUsers } from "./auth";

// 業務ロジックの主軸となる users テーブル
export const users = sqliteTable("users", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	disabled: integer("disabled", { mode: "boolean" }).default(false).notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// 認証IDと業務用ユーザーIDを分離する中間テーブル
// 外部IDの流出をここで防ぐ
export const authMappings = sqliteTable("auth_mappings", {
	// 業務用ユーザーID 
	appUserId: integer("app_user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),

	// 認証システム側のID (FK)
	authUserId: text("auth_user_id")
		.notNull()
		// auth_userテーブルはBetter Authが生成したスキーマを参照
		.references(() => authUsers.id, { onDelete: "cascade" }),
});
