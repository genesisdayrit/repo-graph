import { defineConfig } from "drizzle-kit";
import { homedir, platform } from "node:os";
import { join } from "node:path";

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

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: DATABASE_PATH,
  },
  verbose: true,
  strict: true,
});
