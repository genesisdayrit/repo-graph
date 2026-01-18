import { useRef, useCallback, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { CREATOR_NODE_ID } from "./useGraphData";

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

function RepoGraph2D({ graphData, onNodeHover, newNodeIds = [], isPlaying = false }) {
  const fgRef = useRef();
  const beamQueueRef = useRef([]);
  const activeBeamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const graphDataRef = useRef(graphData);

  // Keep ref updated with latest graphData
  graphDataRef.current = graphData;

  // Queue new nodes for beam animation (only when playing)
  useEffect(() => {
    if (newNodeIds.length === 0 || !isPlaying) return;
    newNodeIds.forEach((nodeId) => {
      beamQueueRef.current.push(nodeId);
    });
  }, [newNodeIds, isPlaying]);

  // Animation loop for processing beam queue
  useEffect(() => {
    const animate = () => {
      // Start next beam if none active
      if (!activeBeamRef.current && beamQueueRef.current.length > 0) {
        const nextNodeId = beamQueueRef.current[0]; // Peek without removing

        // Check if node has coordinates before starting beam
        const nodes = graphDataRef.current.nodes;
        const targetNode = nodes.find((n) => n.id === nextNodeId);
        const creatorNode = nodes.find((n) => n.id === CREATOR_NODE_ID);

        if (targetNode?.x !== undefined && creatorNode?.x !== undefined) {
          // Node is positioned, start the beam
          beamQueueRef.current.shift(); // Now remove from queue
          activeBeamRef.current = { nodeId: nextNodeId, intensity: 1.0 };
        }
        // If not ready, keep in queue and retry next frame
      }
      // Fade active beam
      if (activeBeamRef.current) {
        activeBeamRef.current.intensity -= 0.08;
        if (activeBeamRef.current.intensity <= 0) {
          activeBeamRef.current = null;
        }
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  // Custom node rendering
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    // Guard against undefined coordinates
    if (node.x === undefined || node.y === undefined) return;

    // Creator node - pulsing glow effect
    if (node.id === CREATOR_NODE_ID) {
      const time = Date.now() / 1000;
      const pulse = 0.8 + 0.2 * Math.sin(time * 3);
      const radius = 12 * pulse;

      // Outer glow gradient
      const gradient = ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, radius * 2
      );
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

  // Custom link rendering
  const linkCanvasObject = useCallback((link, ctx) => {
    // Hide the creator-to-root link (beams handle visual connection)
    if (link.isCreatorLink) return;

    const start = link.source;
    const end = link.target;

    if (!start.x || !end.x) return;

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
        return;
      }
      onNodeHover?.(node);
    },
    [onNodeHover]
  );

  // Render beams from creator to new nodes
  const handleRenderFramePost = useCallback(
    (ctx) => {
      const activeBeam = activeBeamRef.current;
      if (!activeBeam) return;

      // Use ref to always get latest graphData (avoids stale closure)
      const nodes = graphDataRef.current.nodes;
      const creatorNode = nodes.find((n) => n.id === CREATOR_NODE_ID);
      const targetNode = nodes.find((n) => n.id === activeBeam.nodeId);
      if (!creatorNode?.x || !targetNode?.x) return;

      const intensity = activeBeam.intensity;

      // Three-layer beam effect
      // Outer glow
      ctx.strokeStyle = `rgba(100, 200, 255, ${intensity * 0.3})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(creatorNode.x, creatorNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();

      // Middle glow
      ctx.strokeStyle = `rgba(100, 200, 255, ${intensity * 0.6})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(creatorNode.x, creatorNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();

      // Core beam
      ctx.strokeStyle = `rgba(200, 240, 255, ${intensity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(creatorNode.x, creatorNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();
    },
    []
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
      // Node value affects repulsion in force layout
      nodeVal={(node) => {
        if (node.id === CREATOR_NODE_ID) return 20;
        return node.type === "directory" ? 5 : 1;
      }}
    />
  );
}

export default RepoGraph2D;
