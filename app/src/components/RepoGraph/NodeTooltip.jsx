function NodeTooltip({ node, position }) {
  if (!node) return null;

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div
      className="node-tooltip"
      style={{
        position: "fixed",
        left: position.x + 15,
        top: position.y + 15,
        pointerEvents: "none",
      }}
    >
      <div className="tooltip-name">
        {node.type === "directory" ? "\uD83D\uDCC1" : "\uD83D\uDCC4"} {node.displayName}
      </div>
      <div className="tooltip-path">{node.path}</div>
      {node.fileType && <div className="tooltip-type">Type: {node.fileType}</div>}
      <div className="tooltip-created">Created: {formatDate(node.fsCreatedAt)}</div>
    </div>
  );
}

export default NodeTooltip;
