# Repo Graph

A visualization tool that displays the creation timeline of files and directories in a repository using an interactive force-directed graph.

## Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)

## Getting Started

### 1. Install dependencies

```bash
cd app
bun install
```

### 2. Run database migrations

```bash
cd app
bun run db:migrate
```

### 3. Start the development server

```bash
cd app
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Usage

1. Open the app in your browser
2. Enter the path to a repository you want to visualize
3. Click to add the repository - the app will scan all files and directories
4. Switch to "Graph" view to see an animated timeline of file creation
5. Use the playback controls to step through the timeline

## Database Location

The SQLite database is stored in your system's application data directory:

- **macOS**: `~/Library/Application Support/repo-graph/repo-graph.db`
- **Linux**: `~/.local/share/repo-graph/repo-graph.db`
- **Windows**: `%APPDATA%/repo-graph/repo-graph.db`

To use a custom database location, set the `REPO_GRAPH_DB_PATH` environment variable:

```bash
REPO_GRAPH_DB_PATH=/path/to/custom.db bun run dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview the production build |
| `bun run db:generate` | Generate database migrations |
| `bun run db:migrate` | Run database migrations |
| `bun run db:push` | Push schema changes directly to DB |
| `bun run db:studio` | Open Drizzle Studio to inspect the database |

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 19, Vite
- **Backend**: Express 5
- **Database**: SQLite with Drizzle ORM
- **Visualization**: react-force-graph-2d, Three.js
