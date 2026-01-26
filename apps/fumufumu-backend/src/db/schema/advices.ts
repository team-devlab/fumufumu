import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./user";
import { consultations } from "./consultations";

// 回答（advice）テーブル
export const advices = sqliteTable("advices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  draft: integer("draft", { mode: "boolean" }).default(false).notNull(),
  hiddenAt: integer("hidden_at", { mode: "timestamp_ms" }),
  consultationId: integer("consultation_id")
    .notNull()
    .references(() => consultations.id, { onDelete: "cascade" }),
  authorId: integer("author_id").references(() => users.id, {
    onDelete: "set null",
  }),

  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),

  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Query APIのwith句で使うリレーション
export const advicesRelations = relations(advices, ({ one }) => ({
  author: one(users, {
    fields: [advices.authorId],
    references: [users.id],
  }),
  consultation: one(consultations, {
    fields: [advices.consultationId],
    references: [consultations.id],
  }),
}));
