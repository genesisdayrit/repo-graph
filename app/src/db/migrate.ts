import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
const MIGRATIONS_FOLDER = resolve(__dirname, "../../drizzle");

// Ensure database directory exists
const dbDir = dirname(DATABASE_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(DATABASE_PATH);
const db = drizzle(sqlite);

console.log("Running migrations...");
console.log(`Database: ${DATABASE_PATH}`);
console.log(`Migrations: ${MIGRATIONS_FOLDER}`);

migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

console.log("Migrations complete!");

sqlite.close();
