# Data Model

This document describes the database schema and data architecture for the Repo Graph application.

## Overview

Repo Graph uses **SQLite** with **Drizzle ORM** for data persistence. The database stores repository metadata and filesystem events (directories and files) with their creation timestamps, enabling timeline-based visualization of how a repository evolved.

## Database Configuration

The database location varies by platform:

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/repo-graph/repo-graph.db` |
| Linux | `~/.local/share/repo-graph/repo-graph.db` |
| Windows | `%APPDATA%/repo-graph/repo-graph.db` |

The database is configured with:
- **WAL mode** enabled for concurrent read access
- **Foreign key constraints** enabled for referential integrity

## Schema

### Repos Table

Stores metadata about scanned repositories.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (UUID) | Primary key |
| `path` | TEXT | Unique filesystem path to the repository root |
| `name` | TEXT | Repository name (extracted from path) |
| `alias` | TEXT | Optional user-defined alias |
| `fsCreatedAt` | INTEGER | Filesystem creation time of root directory (Unix timestamp) |
| `fsModifiedAt` | INTEGER | Filesystem modification time of root directory (Unix timestamp) |
| `createdAt` | INTEGER | Database record creation time |
| `updatedAt` | INTEGER | Database record last update time |

**Indexes:**
- `path_idx` on `path` column for fast lookups by filesystem path

### Repo Events Table

Stores individual filesystem events (files and directories) within a repository.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (UUID) | Primary key |
| `type` | TEXT | Event type: `"directory"` or `"file"` |
| `path` | TEXT | Full filesystem path |
| `repoId` | TEXT | Foreign key to `repos.id` (cascade delete) |
| `fileType` | TEXT | File extension (e.g., `.js`, `.ts`, `.py`) |
| `nodeDepth` | INTEGER | Depth relative to repository root (root = 0) |
| `fsCreatedAt` | INTEGER | Filesystem creation timestamp |
| `fsModifiedAt` | INTEGER | Filesystem modification timestamp |
| `createdAt` | INTEGER | Database record creation time |
| `updatedAt` | INTEGER | Database record last update time |

**Indexes:**
- `repo_id_idx` on `repoId` for fetching events by repository
- `path_idx` on `path` for lookups by filesystem path
- `type_idx` on `type` for filtering by event type

## Entity Relationships

```
┌─────────────┐         ┌─────────────────┐
│    repos    │         │   repo_events   │
├─────────────┤         ├─────────────────┤
│ id (PK)     │────┐    │ id (PK)         │
│ path        │    │    │ type            │
│ name        │    │    │ path            │
│ alias       │    └───►│ repoId (FK)     │
│ fsCreatedAt │         │ fileType        │
│ fsModifiedAt│         │ nodeDepth       │
│ createdAt   │         │ fsCreatedAt     │
│ updatedAt   │         │ fsModifiedAt    │
└─────────────┘         │ createdAt       │
                        │ updatedAt       │
                        └─────────────────┘
```

**Relationship:** One repo has many repo events. When a repo is deleted, all associated events are cascade deleted.

## Data Flow

### Creating a Repository

1. User provides a filesystem path
2. Server validates the path exists and is a directory
3. A new repo record is created with:
   - Auto-generated UUID
   - Name extracted from path (last directory segment)
   - Filesystem timestamps from the root directory
4. Server recursively scans the directory structure
5. Each file and directory becomes a repo event record

### Directory Scanning

The scanning process:

1. Starts at the repository root directory
2. Loads `.gitignore` files at each directory level
3. Filters out ignored paths (always ignores `.git` directories)
4. For each item, captures:
   - Full filesystem path
   - Type (directory or file)
   - File extension (for files)
   - Depth relative to root
   - Creation and modification timestamps

### Timestamp Extraction

Filesystem timestamps are extracted differently by platform:

- **macOS/Windows**: Uses `birthtime` (actual file creation time)
- **Linux**: Falls back to `mtime` (modification time) since birthtime is not reliably available

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/repos` | Create new repo and scan directory |
| `GET` | `/api/repos` | List all repositories |
| `GET` | `/api/repos/:id` | Get single repo metadata |
| `GET` | `/api/repos/:id/events` | Get all events grouped by type |
| `GET` | `/api/repos/:id/events/timeline` | Get events ordered by creation time |
| `POST` | `/api/repos/:id/rescan` | Rescan directory and update events |

## Schema Files

The schema is defined in:
- `app/src/db/schema/repos.ts` - Repos table definition
- `app/src/db/schema/repoEvents.ts` - Repo events table definition
- `app/src/db/schema/index.ts` - Schema exports
- `app/src/db/index.ts` - Database connection and configuration
