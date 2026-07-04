import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { users } from "@/db/schema/user";

export const MODERATION_TARGET_TYPES = ["consultation", "advice"] as const;
export const MODERATION_ACTION_TYPES = ["hide", "unhide"] as const;

export type ModerationTargetType = (typeof MODERATION_TARGET_TYPES)[number];
export type ModerationActionType = (typeof MODERATION_ACTION_TYPES)[number];

export const moderationActions = sqliteTable("moderation_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetType: text("target_type", { enum: MODERATION_TARGET_TYPES }).notNull(),
  targetId: integer("target_id").notNull(),
  action: text("action", { enum: MODERATION_ACTION_TYPES }).notNull(),
  reason: text("reason"),
  adminUserId: integer("admin_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
}, (table) => [
  index("idx_moderation_actions_target").on(table.targetType, table.targetId, table.createdAt),
]);
