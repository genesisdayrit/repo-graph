# Graph Visualization

This document explains how the graph visualization works in Repo Graph.

## Overview

Repo Graph renders repository structures as interactive 2D force-directed graphs using **react-force-graph-2d**. The visualization shows files and directories as nodes connected by edges representing parent-child relationships. A timeline feature lets you watch the repository evolve over time, complete with a "creator node" that fires glowing beams to newly created files and directories.

## Architecture

### Components

```
RepoGraph/
├── RepoGraph2D.jsx      # Main 2D graph renderer with creator node
├── RepoGraph3D.jsx      # Alternative 3D renderer (Three.js)
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

### Creator Node

A special "creator" node is added to the graph that visually represents the creation of new files and directories. The creator node:

- Displays as a large gray circle (12px radius)
- Has a subtle pulsing animation
- Is free to move around the graph (participates in force simulation)
- Has higher repulsion strength to create space around it
- Fires glowing gold beams to newly created nodes during timeline playback

The creator node is linked to the root node but the link is not visually rendered - instead, beam animations handle the visual connection.

## Beam Animation

During timeline playback, when new nodes appear in the graph, a glowing beam animation fires from the creator node to each new node:

### How It Works

1. **Node Detection**: The system tracks which nodes are in the graph and detects when new nodes appear
2. **Queue System**: New nodes are added to a beam queue for sequential processing
3. **Coordinate Check**: Beams only fire once the target node has been positioned by the force simulation
4. **Fade Animation**: Each beam fades from full intensity to transparent over ~200ms

### Visual Effect

The beam consists of three layered lines for a glowing effect:
- **Outer glow**: 10px wide, low opacity gold
- **Middle glow**: 5px wide, medium opacity gold
- **Core beam**: 2px wide, bright yellow-white

### Timing

- Beams are only fired when the timeline is playing (not during manual scrubbing)
- One beam animates at a time to prevent visual chaos
- Beams wait for nodes to have coordinates before firing

## Visual Representation

### Node Types and Sizes

| Node Type | Size | Color | Glow |
|-----------|------|-------|------|
| Creator node | 12px circle (pulsing) | Gray (#888888) | None |
| Root directory | 8px circle | Blue (#4a90d9) | Soft blue glow |
| Subdirectory | 5px circle | Green (#7cb342) | Soft green glow |
| File | 2px dot | Varies by type | Soft color-matched glow |

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

Pure black background (#000000) provides maximum contrast for the colorful nodes and their soft glow effects.

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
| `app/src/components/RepoGraph/RepoGraph2D.jsx` | Main 2D renderer with creator node and beam animation |
| `app/src/components/RepoGraph/RepoGraph3D.jsx` | Alternative Three.js/react-force-graph-3d renderer |
| `app/src/components/RepoGraph/useGraphData.js` | Event-to-graph transformation hook (includes creator node) |
| `app/src/components/RepoGraph/useTimelineAnimation.js` | Timeline playback state management |
| `app/src/components/RepoGraph/GraphControls.jsx` | Play/pause, speed, slider UI |
| `app/src/components/RepoGraph/NodeTooltip.jsx` | Hover information display |
