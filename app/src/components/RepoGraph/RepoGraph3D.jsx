import { useRef, useCallback } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";

// Helper: Get file color based on extension
function getFileColor(fileType) {
  const colors = {
    ".js": 0xf7df1e, // JavaScript yellow
    ".jsx": 0x61dafb, // React blue
    ".ts": 0x3178c6, // TypeScript blue
    ".tsx": 0x61dafb, // React blue
    ".css": 0x264de4, // CSS blue
    ".json": 0xcb8c43, // JSON orange
    ".md": 0x083fa1, // Markdown blue
    ".html": 0xe34c26, // HTML orange
    ".py": 0x3572a5, // Python blue
    ".go": 0x00add8, // Go cyan
    ".rs": 0xdea584, // Rust orange
    ".sql": 0xe38c00, // SQL orange
    ".yml": 0xcb171e, // YAML red
    ".yaml": 0xcb171e, // YAML red
    ".sh": 0x89e051, // Shell green
    ".txt": 0x888888, // Text gray
  };
  return colors[fileType] || 0x888888;
}

// Helper: Create text sprite for labels
function createTextSprite(text, { fontSize = 10, color = "#ffffff" } = {}) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 128;

  ctx.font = `bold ${fontSize * 4}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(24, 6, 1);

  return sprite;
}

function RepoGraph3D({ graphData, onNodeHover }) {
  const fgRef = useRef();

  // Custom node rendering
  const nodeThreeObject = useCallback((node) => {
    if (node.type === "directory") {
      // Directory: Sphere with label
      const group = new THREE.Group();

      // Sphere
      const radius = node.isRoot ? 8 : 5;
      const geometry = new THREE.SphereGeometry(radius);
      const material = new THREE.MeshLambertMaterial({
        color: node.isRoot ? 0x4a90d9 : 0x7cb342,
        transparent: true,
        opacity: 0.9,
      });
      const sphere = new THREE.Mesh(geometry, material);
      group.add(sphere);

      // Label (display name)
      const sprite = createTextSprite(node.displayName, {
        fontSize: node.isRoot ? 14 : 10,
        color: "#ffffff",
      });
      sprite.position.y = radius + 6;
      group.add(sprite);

      return group;
    } else {
      // File: Small dot (no label)
      const geometry = new THREE.SphereGeometry(2);
      const material = new THREE.MeshLambertMaterial({
        color: getFileColor(node.fileType),
        transparent: true,
        opacity: 0.8,
      });
      return new THREE.Mesh(geometry, material);
    }
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
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      nodeThreeObject={nodeThreeObject}
      nodeThreeObjectExtend={false}
      onNodeHover={handleNodeHover}
      linkWidth={1}
      linkOpacity={0.4}
      linkColor={() => "#666666"}
      backgroundColor="#1a1a2e"
      showNavInfo={false}
      // Physics configuration for organic layout
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      warmupTicks={100}
      cooldownTicks={200}
    />
  );
}

export default RepoGraph3D;
