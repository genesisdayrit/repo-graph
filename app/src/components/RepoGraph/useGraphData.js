import { useMemo } from "react";

// Creator node ID constant (must match RepoGraph2D.jsx)
export const CREATOR_NODE_ID = "__creator__";

/**
 * Transform flat repo_events into graph nodes and links
 * Includes a central "creator" node that all items emanate from
 * @param cutoffIndex - number of events to include (event-based, not time-based)
 */
export function useGraphData(repo, events, cutoffIndex) {
  return useMemo(() => {
    if (!repo || !events || events.length === 0) {
      return { nodes: [], links: [] };
    }

    // Sort events by timestamp, then by depth for ties (parents before children)
    const sortedAllEvents = [...events].sort((a, b) => {
      // Primary: by creation time
      const timeA = new Date(a.fsCreatedAt).getTime();
      const timeB = new Date(b.fsCreatedAt).getTime();
      if (timeA !== timeB) return timeA - timeB;
      // Secondary: by path depth (parents first)
      const depthA = a.path.split("/").length;
      const depthB = b.path.split("/").length;
      if (depthA !== depthB) return depthA - depthB;
      // Tertiary: by path alphabetically
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

    // Add creator node - central point that all items emanate from
    const creatorNode = {
      id: CREATOR_NODE_ID,
      displayName: "Creator",
      type: "creator",
      isCreator: true,
      // Pin at center
      fx: 0,
      fy: 0,
    };
    nodes.push(creatorNode);

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

    // Link creator to root
    links.push({
      source: CREATOR_NODE_ID,
      target: repo.id,
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
        existingNode.id = event.id;
        existingNode.type = event.type;
        existingNode.fileType = event.fileType;
        existingNode.fsCreatedAt = event.fsCreatedAt;
        existingNode.fsModifiedAt = event.fsModifiedAt;
        existingNode.isSynthetic = false;
        // Update pathToNode to point to the upgraded node (already does)
        // Links are already in place from synthetic creation
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
