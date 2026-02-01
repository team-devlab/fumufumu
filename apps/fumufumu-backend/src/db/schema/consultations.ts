import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "@/db/schema/user";
import { advices } from "./advices";

// 相談テーブル
export const consultations = sqliteTable("consultations", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	title: text("title").notNull(),
	body: text("body").notNull(),
	draft: integer("draft", { mode: "boolean" }).default(false).notNull(),
	hiddenAt: integer("hidden_at", { mode: "timestamp_ms" }),
	solvedAt: integer("solved_at", { mode: "timestamp_ms" }),
	authorId: integer("author_id")
		.references(() => users.id, { onDelete: "set null" }),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// RQB用: Query APIのwith句で利用するためのリレーション設定
export const consultationsRelations = relations(consultations, ({ one, many }) => ({
	author: one(users, {
		fields: [consultations.authorId],
		references: [users.id],
	}),
	advices: many(advices),
}));
