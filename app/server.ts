import express from "express";
import ViteExpress from "vite-express";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { listCreationTimes } from "./src/server/listCreationTimes";
import { db } from "./src/db";
import { repos, repoEvents } from "./src/db/schema";
import type { NewRepoEvent } from "./src/db/schema";

const app = express();

app.use(express.json());

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the server!" });
});

app.get("/api/repos", async (req, res) => {
  try {
    const allRepos = await db.select().from(repos);
    res.json(allRepos);
  } catch (err) {
    console.error("Error fetching repos:", err);
    res.status(500).json({ error: "Failed to fetch repos" });
  }
});

app.post("/api/list-directory", async (req, res) => {
  const { path } = req.body;

  if (!path || typeof path !== "string") {
    res.status(400).json({ error: "Path is required" });
    return;
  }

  try {
    const result = await listCreationTimes(path);
    res.json(result);
  } catch (err) {
    console.error("Error listing directory:", err);
    res.status(500).json({ error: `Failed to list directory: ${err}` });
  }
});

// Helper function to scan directory and create repo events
async function scanAndCreateEvents(repoId: string, repoPath: string): Promise<NewRepoEvent[]> {
  const result = await listCreationTimes(repoPath);
  const repoPathDepth = repoPath.split("/").filter(Boolean).length;

  const allEntries = [...result.directories, ...result.files];
  const events: NewRepoEvent[] = allEntries.map((entry) => {
    const entryDepth = entry.path.split("/").filter(Boolean).length;
    const nodeDepth = entryDepth - repoPathDepth;
    const lastDotIndex = entry.path.lastIndexOf(".");
    const fileType = entry.type === "file" && lastDotIndex !== -1
      ? entry.path.substring(lastDotIndex)
      : null;

    return {
      id: randomUUID(),
      type: entry.type,
      path: entry.path,
      repoId,
      fileType,
      nodeDepth,
      fsCreatedAt: entry.createdAt,
      fsModifiedAt: entry.modifiedAt,
    };
  });

  return events;
}

// POST /api/repos - Create repo and scan contents
app.post("/api/repos", async (req, res) => {
  const { path } = req.body;

  if (!path || typeof path !== "string") {
    res.status(400).json({ error: "Path is required" });
    return;
  }

  const trimmedPath = path.trim();

  try {
    // Check if repo with this path already exists
    const existingRepo = await db
      .select()
      .from(repos)
      .where(eq(repos.path, trimmedPath))
      .limit(1);

    if (existingRepo.length > 0) {
      res.status(200).json(existingRepo[0]);
      return;
    }

    // Scan directory first to get filesystem metadata
    const scanResult = await listCreationTimes(trimmedPath);

    // Get root directory stats (first entry in directories is the root)
    const rootEntry = scanResult.directories.find(d => d.path === trimmedPath);
    if (!rootEntry) {
      res.status(400).json({ error: "Cannot access directory" });
      return;
    }

    // Extract name from path (last segment)
    const name = trimmedPath.split("/").filter(Boolean).pop() || trimmedPath;

    // Create new repo with filesystem metadata
    const repoId = randomUUID();
    const [newRepo] = await db
      .insert(repos)
      .values({
        id: repoId,
        path: trimmedPath,
        name,
        fsCreatedAt: rootEntry.createdAt,
        fsModifiedAt: rootEntry.modifiedAt,
      })
      .returning();

    // Create repo events from scan result
    const repoPathDepth = trimmedPath.split("/").filter(Boolean).length;
    const allEntries = [...scanResult.directories, ...scanResult.files];
    const events: NewRepoEvent[] = allEntries.map((entry) => {
      const entryDepth = entry.path.split("/").filter(Boolean).length;
      const nodeDepth = entryDepth - repoPathDepth;
      const lastDotIndex = entry.path.lastIndexOf(".");
      const fileType = entry.type === "file" && lastDotIndex !== -1
        ? entry.path.substring(lastDotIndex)
        : null;

      return {
        id: randomUUID(),
        type: entry.type,
        path: entry.path,
        repoId: newRepo.id,
        fileType,
        nodeDepth,
        fsCreatedAt: entry.createdAt,
        fsModifiedAt: entry.modifiedAt,
      };
    });

    if (events.length > 0) {
      await db.insert(repoEvents).values(events);
    }

    res.status(201).json(newRepo);
  } catch (err) {
    console.error("Error creating repo:", err);
    res.status(500).json({ error: "Failed to create repo" });
  }
});

// GET /api/repos/:id - Fetch single repo
app.get("/api/repos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const repo = await db
      .select()
      .from(repos)
      .where(eq(repos.id, id))
      .limit(1);

    if (repo.length === 0) {
      res.status(404).json({ error: "Repo not found" });
      return;
    }

    res.json(repo[0]);
  } catch (err) {
    console.error("Error fetching repo:", err);
    res.status(500).json({ error: "Failed to fetch repo" });
  }
});

// DELETE /api/repos/:id - Delete a repo
app.delete("/api/repos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const repo = await db
      .select()
      .from(repos)
      .where(eq(repos.id, id))
      .limit(1);

    if (repo.length === 0) {
      res.status(404).json({ error: "Repo not found" });
      return;
    }

    await db.delete(repos).where(eq(repos.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting repo:", err);
    res.status(500).json({ error: "Failed to delete repo" });
  }
});

// GET /api/repos/:id/events - Fetch repo events
app.get("/api/repos/:id/events", async (req, res) => {
  const { id } = req.params;

  try {
    const events = await db
      .select()
      .from(repoEvents)
      .where(eq(repoEvents.repoId, id));

    const directories = events.filter((e) => e.type === "directory");
    const files = events.filter((e) => e.type === "file");

    // Sort by path
    directories.sort((a, b) => a.path.localeCompare(b.path));
    files.sort((a, b) => a.path.localeCompare(b.path));

    res.json({ directories, files });
  } catch (err) {
    console.error("Error fetching repo events:", err);
    res.status(500).json({ error: "Failed to fetch repo events" });
  }
});

// GET /api/repos/:id/events/timeline - Fetch repo events ordered by fs_created_at
app.get("/api/repos/:id/events/timeline", async (req, res) => {
  const { id } = req.params;

  try {
    const repo = await db
      .select()
      .from(repos)
      .where(eq(repos.id, id))
      .limit(1);

    if (repo.length === 0) {
      res.status(404).json({ error: "Repo not found" });
      return;
    }

    const events = await db
      .select()
      .from(repoEvents)
      .where(eq(repoEvents.repoId, id))
      .orderBy(asc(repoEvents.fsCreatedAt));

    res.json({ repo: repo[0], events });
  } catch (err) {
    console.error("Error fetching timeline:", err);
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

// POST /api/repos/:id/rescan - Rescan and update repo events
app.post("/api/repos/:id/rescan", async (req, res) => {
  const { id } = req.params;

  try {
    // Get the repo
    const repo = await db
      .select()
      .from(repos)
      .where(eq(repos.id, id))
      .limit(1);

    if (repo.length === 0) {
      res.status(404).json({ error: "Repo not found" });
      return;
    }

    const repoPath = repo[0].path;

    // Rescan directory
    const scanResult = await listCreationTimes(repoPath);

    // Get root directory stats to update repo
    const rootEntry = scanResult.directories.find(d => d.path === repoPath);
    if (rootEntry) {
      await db
        .update(repos)
        .set({
          fsCreatedAt: rootEntry.createdAt,
          fsModifiedAt: rootEntry.modifiedAt,
        })
        .where(eq(repos.id, id));
    }

    // Delete existing events
    await db.delete(repoEvents).where(eq(repoEvents.repoId, id));

    // Create new events
    const repoPathDepth = repoPath.split("/").filter(Boolean).length;
    const allEntries = [...scanResult.directories, ...scanResult.files];
    const events: NewRepoEvent[] = allEntries.map((entry) => {
      const entryDepth = entry.path.split("/").filter(Boolean).length;
      const nodeDepth = entryDepth - repoPathDepth;
      const lastDotIndex = entry.path.lastIndexOf(".");
      const fileType = entry.type === "file" && lastDotIndex !== -1
        ? entry.path.substring(lastDotIndex)
        : null;

      return {
        id: randomUUID(),
        type: entry.type,
        path: entry.path,
        repoId: id,
        fileType,
        nodeDepth,
        fsCreatedAt: entry.createdAt,
        fsModifiedAt: entry.modifiedAt,
      };
    });

    if (events.length > 0) {
      await db.insert(repoEvents).values(events);
    }

    // Return updated events
    const directories = events.filter((e) => e.type === "directory");
    const files = events.filter((e) => e.type === "file");
    directories.sort((a, b) => a.path.localeCompare(b.path));
    files.sort((a, b) => a.path.localeCompare(b.path));

    res.json({ directories, files });
  } catch (err) {
    console.error("Error rescanning repo:", err);
    res.status(500).json({ error: "Failed to rescan repo" });
  }
});

ViteExpress.listen(app, 3000, () => {
  console.log("Server running at http://localhost:3000");
});
