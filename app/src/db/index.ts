import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir, platform } from "node:os";

/**
 * Get the default application data directory based on platform.
 * - macOS: ~/Library/Application Support/repo-graph/
 * - Linux: ~/.local/share/repo-graph/
 * - Windows: %APPDATA%/repo-graph/
 */
function getDefaultAppDataDir(): string {
  const home = homedir();

  switch (platform()) {
    case "darwin":
      return join(home, "Library", "Application Support", "repo-graph");
    case "win32":
      return join(process.env.APPDATA || join(home, "AppData", "Roaming"), "repo-graph");
    default:
      // Linux and others - use XDG standard
      return join(process.env.XDG_DATA_HOME || join(home, ".local", "share"), "repo-graph");
  }
}

/**
 * Get database path from environment variable or use default.
 * Set REPO_GRAPH_DB_PATH to override the default location.
 */
function getDatabasePath(): string {
  if (process.env.REPO_GRAPH_DB_PATH) {
    return process.env.REPO_GRAPH_DB_PATH;
  }
  return join(getDefaultAppDataDir(), "repo-graph.db");
}

const DATABASE_PATH = getDatabasePath();

// Ensure database directory exists
const dbDir = dirname(DATABASE_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

console.log(`Database location: ${DATABASE_PATH}`);

// Create SQLite connection
const sqlite = new Database(DATABASE_PATH);

// Enable WAL mode for better concurrent read performance
sqlite.exec("PRAGMA journal_mode = WAL");

// Enable foreign keys (disabled by default in SQLite)
sqlite.exec("PRAGMA foreign_keys = ON");

// Create Drizzle instance with schema for relational queries
export const db = drizzle(sqlite, { schema });

// Export for other modules that need the path
export const DATABASE_FILE_PATH = DATABASE_PATH;

export type DbClient = typeof db;
