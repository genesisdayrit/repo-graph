import { useRef, useCallback, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";

// Helper: Get file color based on extension
function getFileColor(fileType) {
  const colors = {
    ".js": "#f7df1e", // JavaScript yellow
    ".jsx": "#61dafb", // React blue
    ".ts": "#3178c6", // TypeScript blue
    ".tsx": "#61dafb", // React blue
    ".css": "#264de4", // CSS blue
    ".json": "#cb8c43", // JSON orange
    ".md": "#083fa1", // Markdown blue
    ".html": "#e34c26", // HTML orange
    ".py": "#3572a5", // Python blue
    ".go": "#00add8", // Go cyan
    ".rs": "#dea584", // Rust orange
    ".sql": "#e38c00", // SQL orange
    ".yml": "#cb171e", // YAML red
    ".yaml": "#cb171e", // YAML red
    ".sh": "#89e051", // Shell green
    ".txt": "#888888", // Text gray
  };
  return colors[fileType] || "#888888";
}

// Creator node ID constant
const CREATOR_NODE_ID = "__creator__";

function RepoGraph2D({ graphData, onNodeHover, newNodeIds = [], isPlaying = false }) {
  const fgRef = useRef();
  // Queue of node IDs waiting to be animated
  const beamQueueRef = useRef([]);
  // Current active beam: { nodeId, intensity } or null
  const activeBeamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Queue up new nodes for sequential beam animation - ONLY when playing
  useEffect(() => {
    if (newNodeIds.length === 0 || !isPlaying) return;

    // Add new nodes to the queue
    newNodeIds.forEach((nodeId) => {
      const node = graphData.nodes.find((n) => n.id === nodeId);
      if (node) {
        beamQueueRef.current.push(nodeId);
      }
    });
  }, [newNodeIds, graphData.nodes, isPlaying]);

  // Animation loop - process one beam at a time
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (currentTime) => {
      const delta = currentTime - lastTime;

      if (delta >= 16) {
        // ~60fps
        lastTime = currentTime;

        // If no active beam, try to start the next one from queue
        if (!activeBeamRef.current && beamQueueRef.current.length > 0) {
          const nextNodeId = beamQueueRef.current.shift();
          activeBeamRef.current = { nodeId: nextNodeId, intensity: 1.0 };
        }

        // Fade the active beam
        if (activeBeamRef.current) {
          activeBeamRef.current.intensity -= 0.08; // Fast fade for quick succession
          if (activeBeamRef.current.intensity <= 0) {
            activeBeamRef.current = null; // Clear to allow next beam
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Draw single beam from creator to current target node
  const handleRenderFramePost = useCallback(
    (ctx, globalScale) => {
      const activeBeam = activeBeamRef.current;
      if (!activeBeam) return;

      // Find creator node position
      const creatorNode = graphData.nodes.find((n) => n.id === CREATOR_NODE_ID);
      if (!creatorNode || creatorNode.x === undefined) return;

      const creatorX = creatorNode.x;
      const creatorY = creatorNode.y;

      // Find target node
      const targetNode = graphData.nodes.find((n) => n.id === activeBeam.nodeId);
      if (!targetNode || targetNode.x === undefined) return;

      const intensity = activeBeam.intensity;

      // Draw glowing beam from creator to target
      // Outer glow
      ctx.strokeStyle = `rgba(100, 200, 255, ${intensity * 0.3})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(creatorX, creatorY);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();

      // Middle glow
      ctx.strokeStyle = `rgba(100, 200, 255, ${intensity * 0.6})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(creatorX, creatorY);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();

      // Core beam
      ctx.strokeStyle = `rgba(200, 240, 255, ${intensity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(creatorX, creatorY);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();
    },
    [graphData.nodes]
  );

  // Custom node rendering
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    // Guard against undefined coordinates
    if (node.x === undefined || node.y === undefined) return;

    // Creator node: special pulsing center point
    if (node.id === CREATOR_NODE_ID) {
      const time = Date.now() / 1000;
      const pulse = 0.8 + 0.2 * Math.sin(time * 3); // Subtle pulse between 0.8 and 1.0
      const radius = 12 * pulse;

      // Outer glow
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2);
      gradient.addColorStop(0, "rgba(100, 200, 255, 0.8)");
      gradient.addColorStop(0.5, "rgba(100, 200, 255, 0.3)");
      gradient.addColorStop(1, "rgba(100, 200, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius * 2, 0, 2 * Math.PI);
      ctx.fill();

      // Core
      ctx.fillStyle = "#64c8ff";
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      return;
    }

    // Directory nodes
    if (node.type === "directory") {
      const radius = node.isRoot ? 8 : 5;
      const color = node.isRoot ? "#4a90d9" : "#7cb342";

      // Draw circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      const label = node.displayName;
      const fontSize = node.isRoot ? 12 / globalScale : 10 / globalScale;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, node.x, node.y + radius + 2);
    } else {
      // File nodes: small dots
      const radius = 2;
      ctx.fillStyle = getFileColor(node.fileType);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, []);

  // Custom link rendering - simple lines (beams are drawn separately)
  const linkCanvasObject = useCallback((link, ctx) => {
    const start = link.source;
    const end = link.target;

    if (!start.x || !end.x) return;

    // Normal link
    ctx.strokeStyle = "rgba(102, 102, 102, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }, []);

  // Node hover handler
  const handleNodeHover = useCallback(
    (node) => {
      document.body.style.cursor = node ? "pointer" : "default";
      // Don't show tooltip for creator node
      if (node && node.id === CREATOR_NODE_ID) {
        onNodeHover?.(null);
      } else {
        onNodeHover?.(node);
      }
    },
    [onNodeHover]
  );

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      nodeCanvasObject={nodeCanvasObject}
      nodeCanvasObjectMode={() => "replace"}
      linkCanvasObject={linkCanvasObject}
      linkCanvasObjectMode={() => "replace"}
      onNodeHover={handleNodeHover}
      onRenderFramePost={handleRenderFramePost}
      backgroundColor="#1a1a2e"
      // Physics configuration for organic layout
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      warmupTicks={100}
      cooldownTicks={200}
      // Pin creator node at center
      nodeVal={(node) => (node.id === CREATOR_NODE_ID ? 20 : node.type === "directory" ? 5 : 1)}
    />
  );
}

export { CREATOR_NODE_ID };
export default RepoGraph2D;
