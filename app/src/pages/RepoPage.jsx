import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import RepoGraph2D from "../components/RepoGraph/RepoGraph2D";
import GraphControls from "../components/RepoGraph/GraphControls";
import NodeTooltip from "../components/RepoGraph/NodeTooltip";
import { useGraphData, CREATOR_NODE_ID } from "../components/RepoGraph/useGraphData";
import { useTimelineAnimation } from "../components/RepoGraph/useTimelineAnimation";

function RepoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [rescanning, setRescanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [newNodeIds, setNewNodeIds] = useState([]);
  const prevNodeIdsRef = useRef(new Set());
  const prevPlayingRef = useRef(false);

  // Fetch repo data
  useEffect(() => {
    async function fetchRepo() {
      try {
        const response = await fetch(`/api/repos/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch repo");
        }

        setRepo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRepo();
  }, [id]);

  // Fetch events when repo is loaded (for table view)
  useEffect(() => {
    async function fetchEvents() {
      if (!repo) return;

      try {
        const response = await fetch(`/api/repos/${id}/events`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch events");
        }

        setEvents(data);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchEvents();
  }, [repo, id]);

  // Fetch timeline events when switching to graph view
  useEffect(() => {
    async function fetchTimeline() {
      if (!repo || viewMode !== "graph") return;

      try {
        const response = await fetch(`/api/repos/${id}/events/timeline`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch timeline");
        }

        setTimelineEvents(data.events);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchTimeline();
  }, [repo, id, viewMode]);

  // Timeline animation controls (event-based)
  const eventCount = timelineEvents.length;
  const {
    currentIndex,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    onIndexChange,
    onPlayPause,
  } = useTimelineAnimation(eventCount);

  // Transform data to graph format (using event index, not timestamp)
  const graphData = useGraphData(repo, timelineEvents, currentIndex);

  // Track newly appearing nodes for beam animation
  useEffect(() => {
    if (!graphData.nodes.length) return;

    // Reset tracking when playback starts (so nodes appear "new" again)
    if (isPlaying && !prevPlayingRef.current) {
      prevNodeIdsRef.current = new Set();
    }
    prevPlayingRef.current = isPlaying;

    const currentNodeIds = new Set(
      graphData.nodes
        .filter((n) => n.id !== CREATOR_NODE_ID)
        .map((n) => n.id)
    );
    const prevNodeIds = prevNodeIdsRef.current;

    // Find nodes that just appeared
    const newIds = [];
    currentNodeIds.forEach((id) => {
      if (!prevNodeIds.has(id)) {
        newIds.push(id);
      }
    });

    if (newIds.length > 0) {
      setNewNodeIds(newIds);
    }

    prevNodeIdsRef.current = currentNodeIds;
  }, [graphData.nodes, isPlaying]);

  // Track mouse position for tooltip
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node);
  }, []);

  const handleRescan = async () => {
    setRescanning(true);
    setError(null);

    try {
      const response = await fetch(`/api/repos/${id}/rescan`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to rescan");
      }

      setEvents(data);
      // Clear timeline events to force refetch
      setTimelineEvents([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setRescanning(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${repo.name}"?`)) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/repos/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete repo");
      }

      navigate("/");
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading repo...</p>
      </div>
    );
  }

  if (error && !repo) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link to="/" className="back-link">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className={viewMode === "graph" ? "repo-page graph-view" : "repo-page"}>
      <div className="repo-header">
        <Link to="/" className="back-link">
          &larr; Back
        </Link>
        <h1>{repo.name}</h1>
        <div className="view-toggle">
          <button
            className={viewMode === "table" ? "active" : ""}
            onClick={() => setViewMode("table")}
          >
            Table
          </button>
          <button
            className={viewMode === "graph" ? "active" : ""}
            onClick={() => setViewMode("graph")}
          >
            Graph
          </button>
        </div>
        <div className="header-actions">
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="rescan-button"
          >
            {rescanning ? "Rescanning..." : "Rescan"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="delete-button"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {viewMode === "table" && <p className="repo-path">{repo.path}</p>}

      {error && <div className="error">{error}</div>}

      {viewMode === "table" && events && (
        <div className="container results">
          <section>
            <h2>Directories ({events.directories.length})</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Modified</th>
                    <th>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {events.directories.map((entry) => (
                    <tr key={entry.id}>
                      <td className="date">{formatDate(entry.fsCreatedAt)}</td>
                      <td className="date">{formatDate(entry.fsModifiedAt)}</td>
                      <td className="path">{entry.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>Files ({events.files.length})</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Modified</th>
                    <th>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {events.files.map((entry) => (
                    <tr key={entry.id}>
                      <td className="date">{formatDate(entry.fsCreatedAt)}</td>
                      <td className="date">{formatDate(entry.fsModifiedAt)}</td>
                      <td className="path">{entry.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {viewMode === "graph" && (
        <>
          <div className="graph-container">
            <RepoGraph2D
              graphData={graphData}
              onNodeHover={handleNodeHover}
              newNodeIds={newNodeIds}
              isPlaying={isPlaying}
            />
          </div>

          {eventCount > 0 && (
            <GraphControls
              eventCount={eventCount}
              currentIndex={currentIndex}
              onIndexChange={onIndexChange}
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              playbackSpeed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
            />
          )}

          <NodeTooltip node={hoveredNode} position={mousePosition} />

          <div className="graph-stats">
            {currentIndex ?? eventCount} / {eventCount} events
          </div>
        </>
      )}
    </div>
  );
}

export default RepoPage;
