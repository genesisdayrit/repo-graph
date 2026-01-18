import { useMemo } from "react";

/**
 * Transform flat repo_events into graph nodes and links
 */
export function useGraphData(repo, events, cutoffTime) {
  return useMemo(() => {
    if (!repo || !events || events.length === 0) {
      return { nodes: [], links: [] };
    }

    // Filter events up to cutoff time
    const visibleEvents = cutoffTime
      ? events.filter((e) => e.fsCreatedAt <= cutoffTime)
      : events;

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

    // Process each event
    for (const event of visibleEvents) {
      // Skip root directory (it's already added)
      if (event.path === repo.path) continue;

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

      // Find parent directory and create link
      const parentPath = pathParts.slice(0, -1).join("/");
      const parentNode = pathToNode.get(parentPath);

      if (parentNode) {
        links.push({
          source: parentNode.id,
          target: node.id,
        });
      }
    }

    return { nodes, links };
  }, [repo, events, cutoffTime]);
}

/**
 * Extract unique timestamps for timeline
 */
export function useTimestamps(events) {
  return useMemo(() => {
    if (!events || events.length === 0) return [];

    // Get unique timestamps sorted chronologically
    const timestamps = [...new Set(events.map((e) => e.fsCreatedAt))];
    timestamps.sort((a, b) => new Date(a) - new Date(b));

    return timestamps;
  }, [events]);
}
