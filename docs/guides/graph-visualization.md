# Graph Visualization

This document explains how the 3D graph visualization works in Repo Graph.

## Overview

Repo Graph renders repository structures as interactive 3D force-directed graphs using **Three.js** and **react-force-graph-3d**. The visualization shows files and directories as nodes connected by edges representing parent-child relationships. A timeline feature lets you watch the repository evolve over time.

## Architecture

### Components

```
RepoGraph/
├── RepoGraph3D.jsx      # Main 3D graph renderer
├── useGraphData.js      # Transforms events to graph format
├── useTimelineAnimation.js  # Timeline playback controls
├── GraphControls.jsx    # UI controls for timeline
└── NodeTooltip.jsx      # Hover tooltip display
```

### Data Flow

```
Repo Events (from API)
        │
        ▼
┌───────────────────┐
│   useGraphData    │ ─── Transforms flat events to graph nodes/links
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ useTimelineAnimation │ ─── Filters by cutoff time
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   RepoGraph3D     │ ─── Renders 3D visualization
└───────────────────┘
```

## Graph Data Transformation

### From Events to Nodes

Each repo event becomes a graph node:

```javascript
{
  id: "unique-uuid",
  path: "/Users/example/project/src/index.js",
  name: "index.js",
  type: "file",
  fileType: ".js",
  depth: 2,
  fsCreatedAt: 1704067200000
}
```

### Building Parent-Child Links

Links are created by parsing file paths:

1. For each node, extract its parent path
2. Find the node with that parent path
3. Create a link: `{ source: parentId, target: childId }`

Example:
- `/project/src/index.js` → parent is `/project/src`
- Link connects the `src` directory node to the `index.js` file node

### Root Node

A special root node is created from the repo metadata, serving as the graph's origin point.

## Visual Representation

### Node Types and Sizes

| Node Type | Size | Color |
|-----------|------|-------|
| Root directory | 8px sphere | Blue (#4a90d9) |
| Subdirectory | 5px sphere | Green (#7cb342) |
| File | 2px dot | Varies by type |

### File Type Colors

Files are color-coded by extension:

| Extension | Color | Hex |
|-----------|-------|-----|
| `.js` | Yellow | #f7df1e |
| `.jsx`, `.tsx` | React Blue | #61dafb |
| `.ts` | TypeScript Blue | #3178c6 |
| `.css` | CSS Blue | #264de4 |
| `.json` | Orange | #cb8c43 |
| `.py` | Python Blue | #3572a5 |
| `.go` | Go Cyan | #00add8 |
| `.rs` | Rust Orange | #dea584 |
| `.sql` | SQL Orange | #e38c00 |
| `.yml`, `.yaml` | YAML Red | #cb171e |
| `.sh` | Shell Green | #89e051 |
| Other | Gray | #888888 |

### Node Labels

- Root and directories display text labels (file/folder name)
- Label size scales with node importance
- Labels face the camera (billboard effect)

### Links

- Connect parent directories to their children
- Semi-transparent (40% opacity) for visual clarity
- Use force-directed layout for natural spacing

## Force-Directed Layout

The graph uses D3's force simulation with these parameters:

| Parameter | Value | Effect |
|-----------|-------|--------|
| `d3AlphaDecay` | 0.02 | Slow decay keeps graph moving longer |
| `d3VelocityDecay` | 0.3 | Moderate damping for smooth settling |
| `warmupTicks` | 100 | Initial iterations before rendering |
| `cooldownTicks` | 200 | Iterations until layout stabilizes |

The force simulation naturally:
- Pushes nodes apart (charge repulsion)
- Pulls linked nodes together (link tension)
- Results in hierarchical clusters where subdirectories group near their parent

## Timeline Animation

### How It Works

1. Events are sorted by `fsCreatedAt` timestamp
2. A cutoff time filters which nodes appear
3. Playing the animation advances the cutoff time
4. Nodes "appear" in the order they were created

### Controls

| Control | Function |
|---------|----------|
| Play/Pause | Start/stop timeline animation |
| Speed | 0.5x, 1x, 2x, 4x playback speeds |
| Slider | Manual scrubbing through timeline |
| Show All | Jump to show complete graph |

### Implementation

```javascript
// useTimelineAnimation.js
- Tracks current cutoff timestamp
- Advances time on animation frame
- Resets to beginning when reaching end
- Exposes play, pause, seek functions
```

## User Interactions

### Camera Controls

- **Rotate**: Click and drag
- **Zoom**: Scroll wheel
- **Pan**: Right-click and drag

### Node Hover

Hovering over a node displays a tooltip showing:
- Icon (folder or file emoji)
- Name
- Full path
- File type (for files)
- Creation date

### Background

Dark theme background (#1a1a2e) optimizes contrast for the colorful nodes.

## Performance Considerations

### Optimization Techniques

1. **Memoization**: Graph data transformation uses `useMemo` to avoid recalculation
2. **Gitignore filtering**: Excluded files never enter the database, reducing node count
3. **Database indexes**: Fast queries for timeline data
4. **Lazy loading**: Events fetched only when viewing graph

### Large Repositories

For repositories with many files:
- The force layout may take longer to stabilize
- Consider using the timeline to progressively reveal structure
- Directory scanning respects `.gitignore` to reduce noise

## Component Files

| File | Purpose |
|------|---------|
| `app/src/components/RepoGraph/RepoGraph3D.jsx` | Main Three.js/react-force-graph-3d renderer |
| `app/src/components/RepoGraph/useGraphData.js` | Event-to-graph transformation hook |
| `app/src/components/RepoGraph/useTimelineAnimation.js` | Timeline playback state management |
| `app/src/components/RepoGraph/GraphControls.jsx` | Play/pause, speed, slider UI |
| `app/src/components/RepoGraph/NodeTooltip.jsx` | Hover information display |
