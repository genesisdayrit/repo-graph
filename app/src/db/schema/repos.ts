import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const repos = sqliteTable("repos", {
  id: text("id").primaryKey(),
  path: text("path").notNull().unique(),
  name: text("name").notNull(),
  alias: text("alias"),
  // Filesystem metadata times (for the root directory)
  fsCreatedAt: text("fs_created_at").notNull(),
  fsModifiedAt: text("fs_modified_at").notNull(),
  // Database record times
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Repo = typeof repos.$inferSelect;
export type NewRepo = typeof repos.$inferInsert;
