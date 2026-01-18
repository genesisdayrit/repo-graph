import { useRef, useCallback } from "react";
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

function RepoGraph2D({ graphData, onNodeHover }) {
  const fgRef = useRef();

  // Custom node rendering
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    // Guard against undefined coordinates
    if (node.x === undefined || node.y === undefined) return;

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
      onNodeHover?.(node);
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
      backgroundColor="#1a1a2e"
      // Physics configuration for organic layout
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      warmupTicks={100}
      cooldownTicks={200}
      // Node value affects repulsion in force layout
      nodeVal={(node) => (node.type === "directory" ? 5 : 1)}
    />
  );
}

export default RepoGraph2D;
