import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { repos } from "./repos";

export const repoEvents = sqliteTable(
  "repo_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type", { enum: ["directory", "file"] }).notNull(),
    path: text("path").notNull(),
    repoId: integer("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    fileType: text("file_type"),
    nodeDepth: integer("node_depth").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("repo_events_repo_id_idx").on(table.repoId),
    index("repo_events_path_idx").on(table.path),
    index("repo_events_type_idx").on(table.type),
  ]
);

export type RepoEvent = typeof repoEvents.$inferSelect;
export type NewRepoEvent = typeof repoEvents.$inferInsert;
