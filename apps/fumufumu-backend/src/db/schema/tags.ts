import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import { consultations } from "@/db/schema/consultations";

// タグテーブル（マスタ管理型）
export const tags = sqliteTable("tags", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull().unique(),
	sortOrder: integer("sort_order").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
});

// 相談-タグ中間テーブル
export const consultationTaggings = sqliteTable("consultation_taggings", {
	consultationId: integer("consultation_id")
		.notNull()
		.references(() => consultations.id, { onDelete: "cascade" }),
	tagId: integer("tag_id")
		.notNull()
		.references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
	primaryKey({ columns: [table.consultationId, table.tagId] }),
	// タグ→相談方向の検索用インデックス
	index("idx_consultation_taggings_tag_id").on(table.tagId),
]);

// RQB用: tagsのリレーション設定
export const tagsRelations = relations(tags, ({ many }) => ({
	consultationTaggings: many(consultationTaggings),
}));

// RQB用: consultation_taggingsのリレーション設定
export const consultationTaggingsRelations = relations(consultationTaggings, ({ one }) => ({
	consultation: one(consultations, {
		fields: [consultationTaggings.consultationId],
		references: [consultations.id],
	}),
	tag: one(tags, {
		fields: [consultationTaggings.tagId],
		references: [tags.id],
	}),
}));
