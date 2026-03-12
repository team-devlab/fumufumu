import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const CONTENT_CHECK_TARGET_TYPES = ["consultation", "advice"] as const;
export const CONTENT_CHECK_STATUSES = ["pending", "approved", "rejected"] as const;

export type ContentCheckTargetType = (typeof CONTENT_CHECK_TARGET_TYPES)[number];
export type ContentCheckStatus = (typeof CONTENT_CHECK_STATUSES)[number];

export const contentChecks = sqliteTable("content_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetType: text("target_type", { enum: CONTENT_CHECK_TARGET_TYPES }).notNull(),
  targetId: integer("target_id").notNull(),
  status: text("status", { enum: CONTENT_CHECK_STATUSES }).notNull().default("pending"),
  reason: text("reason"),
  checkedAt: integer("checked_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, (table) => [
  uniqueIndex("uq_content_checks_target").on(table.targetType, table.targetId),
  index("idx_content_checks_status_created_at").on(table.status, table.createdAt),
]);
