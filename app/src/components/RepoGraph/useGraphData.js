import { useMemo } from "react";

export const CREATOR_NODE_ID = "__creator__";

/**
 * Transform flat repo_events into graph nodes and links
 * @param cutoffIndex - number of events to include (event-based, not time-based)
 */
export function useGraphData(repo, events, cutoffIndex) {
  return useMemo(() => {
    if (!repo || !events || events.length === 0) {
      return { nodes: [], links: [] };
    }

    // Sort events by timestamp (grouped by second), then by depth (parents first)
    const sortedAllEvents = [...events].sort((a, b) => {
      const timeA = new Date(a.fsCreatedAt).getTime();
      const timeB = new Date(b.fsCreatedAt).getTime();
      // Primary: by timestamp rounded to seconds (groups events in same second)
      const secondA = Math.floor(timeA / 1000);
      const secondB = Math.floor(timeB / 1000);
      if (secondA !== secondB) return secondA - secondB;
      // Secondary: by node depth (parents before children)
      const depthA = a.nodeDepth;
      const depthB = b.nodeDepth;
      if (depthA !== depthB) return depthA - depthB;
      // Tertiary: by exact timestamp
      if (timeA !== timeB) return timeA - timeB;
      // Quaternary: by path alphabetically
      return a.path.localeCompare(b.path);
    });

    // Take first N events based on cutoffIndex
    const visibleEvents =
      cutoffIndex !== null && cutoffIndex !== undefined
        ? sortedAllEvents.slice(0, cutoffIndex)
        : sortedAllEvents;

    // Build path-to-node map for linking
    const pathToNode = new Map();
    const nodes = [];
    const links = [];

    // Add root node (the repo itself)
    const rootNode = {
      id: repo.id,
      path: repo.path,
      displayName: repo.name,
      type: "directory",
      isRoot: true,
      depth: 0,
      fsCreatedAt: repo.fsCreatedAt,
    };
    nodes.push(rootNode);
    pathToNode.set(repo.path, rootNode);

    // Add creator node (free-moving, not fixed at center)
    const creatorNode = {
      id: CREATOR_NODE_ID,
      displayName: "Creator",
      type: "creator",
      isCreator: true,
    };
    nodes.push(creatorNode);

    // Link creator to root
    links.push({
      source: CREATOR_NODE_ID,
      target: repo.id,
      isCreatorLink: true,
    });

    // Helper to ensure all ancestor directories exist
    const ensureParentExists = (childPath) => {
      const pathParts = childPath.split("/");
      const parentPath = pathParts.slice(0, -1).join("/");

      // Stop if we've reached the repo root or parent already exists
      if (parentPath === repo.path || pathToNode.has(parentPath)) {
        return pathToNode.get(parentPath);
      }

      // Recursively ensure grandparent exists first
      const grandparent = ensureParentExists(parentPath);

      // Create the missing parent directory
      const parentName = pathParts[pathParts.length - 2];
      const parentNode = {
        id: `synthetic-${parentPath}`,
        path: parentPath,
        displayName: parentName,
        type: "directory",
        depth: pathParts.length - 1,
        isRoot: false,
        isSynthetic: true, // Mark as auto-created
      };

      nodes.push(parentNode);
      pathToNode.set(parentPath, parentNode);

      // Link to grandparent
      if (grandparent) {
        links.push({
          source: grandparent.id,
          target: parentNode.id,
        });
      }

      return parentNode;
    };

    // Process each event (already sorted by time, then depth)
    for (const event of visibleEvents) {
      // Skip root directory (it's already added)
      if (event.path === repo.path) continue;

      // Check if a synthetic node already exists for this path
      const existingNode = pathToNode.get(event.path);
      if (existingNode && existingNode.isSynthetic) {
        // Upgrade synthetic node with real event data
        // NOTE: We intentionally do NOT change existingNode.id because links
        // were already created referencing the synthetic id. Changing the id
        // would orphan those links since ForceGraph matches by id.
        existingNode.type = event.type;
        existingNode.fileType = event.fileType;
        existingNode.fsCreatedAt = event.fsCreatedAt;
        existingNode.fsModifiedAt = event.fsModifiedAt;
        existingNode.isSynthetic = false;
        continue;
      }

      // Extract display name from path
      const pathParts = event.path.split("/");
      const displayName = pathParts[pathParts.length - 1];

      const node = {
        id: event.id,
        path: event.path,
        displayName,
        type: event.type,
        fileType: event.fileType,
        depth: event.nodeDepth,
        fsCreatedAt: event.fsCreatedAt,
        fsModifiedAt: event.fsModifiedAt,
        isRoot: false,
      };

      nodes.push(node);
      pathToNode.set(event.path, node);

      // Ensure parent exists (creates synthetic nodes if needed)
      const parentPath = pathParts.slice(0, -1).join("/");
      let parentNode = pathToNode.get(parentPath);

      if (!parentNode && parentPath !== repo.path) {
        // Parent doesn't exist - create it and any missing ancestors
        parentNode = ensureParentExists(event.path);
      } else if (!parentNode) {
        // Parent is the repo root
        parentNode = pathToNode.get(repo.path);
      }

      if (parentNode) {
        links.push({
          source: parentNode.id,
          target: node.id,
        });
      }
    }

    return { nodes, links };
  }, [repo, events, cutoffIndex]);
}
