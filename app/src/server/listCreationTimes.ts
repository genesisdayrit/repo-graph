import { readdir, stat, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import ignore, { Ignore } from "ignore";

export interface FileEntry {
  path: string;
  createdAt: string;
  type: "file" | "directory";
}

export interface ListResult {
  directories: FileEntry[];
  files: FileEntry[];
}

async function loadGitignoreSpecs(
  directory: string
): Promise<Map<string, Ignore>> {
  const specs = new Map<string, Ignore>();

  async function walkForGitignore(dir: string): Promise<void> {
    const gitignorePath = join(dir, ".gitignore");

    try {
      const content = await readFile(gitignorePath, "utf-8");
      const ig = ignore().add(content);
      specs.set(dir, ig);
    } catch {
      // No .gitignore in this directory
    }

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== ".git") {
          await walkForGitignore(join(dir, entry.name));
        }
      }
    } catch {
      // Can't read directory
    }
  }

  await walkForGitignore(directory);
  return specs;
}

function isIgnored(
  filePath: string,
  baseDir: string,
  isDirectory: boolean,
  gitignoreSpecs: Map<string, Ignore>
): boolean {
  // Always ignore .git directories
  if (filePath.includes("/.git/") || filePath.endsWith("/.git")) {
    return true;
  }

  for (const [gitignoreDir, ig] of gitignoreSpecs) {
    try {
      let relPath = relative(gitignoreDir, filePath);
      if (isDirectory) {
        relPath += "/";
      }
      if (relPath && !relPath.startsWith("..") && ig.ignores(relPath)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

function formatDate(date: Date): string {
  return date.toISOString();
}

async function getCreationTime(filePath: string): Promise<Date> {
  const stats = await stat(filePath);
  // birthtime is creation time on macOS/Windows, falls back to mtime on Linux
  return stats.birthtime;
}

export async function listCreationTimes(directory: string): Promise<ListResult> {
  const directories: FileEntry[] = [];
  const files: FileEntry[] = [];

  // Load all .gitignore specs
  const gitignoreSpecs = await loadGitignoreSpecs(directory);

  // Add root directory
  try {
    const rootCreatedAt = await getCreationTime(directory);
    directories.push({
      path: directory,
      createdAt: formatDate(rootCreatedAt),
      type: "directory",
    });
  } catch (err) {
    console.error(`Warning: Cannot access ${directory}:`, err);
  }

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error(`Warning: Cannot read directory ${dir}:`, err);
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const isDir = entry.isDirectory();

      if (isIgnored(fullPath, directory, isDir, gitignoreSpecs)) {
        continue;
      }

      try {
        const createdAt = await getCreationTime(fullPath);
        const fileEntry: FileEntry = {
          path: fullPath,
          createdAt: formatDate(createdAt),
          type: isDir ? "directory" : "file",
        };

        if (isDir) {
          directories.push(fileEntry);
          await walk(fullPath);
        } else {
          files.push(fileEntry);
        }
      } catch (err) {
        console.error(`Warning: Cannot access ${fullPath}:`, err);
      }
    }
  }

  await walk(directory);

  // Sort by path
  directories.sort((a, b) => a.path.localeCompare(b.path));
  files.sort((a, b) => a.path.localeCompare(b.path));

  return { directories, files };
}
