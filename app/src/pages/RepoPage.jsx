import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import RepoGraph3D from "../components/RepoGraph/RepoGraph3D";
import GraphControls from "../components/RepoGraph/GraphControls";
import NodeTooltip from "../components/RepoGraph/NodeTooltip";
import { useGraphData, useTimestamps } from "../components/RepoGraph/useGraphData";
import { useTimelineAnimation } from "../components/RepoGraph/useTimelineAnimation";

function RepoPage() {
  const { id } = useParams();
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [rescanning, setRescanning] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

  // Extract timestamps for timeline
  const timestamps = useTimestamps(timelineEvents);

  // Timeline animation controls
  const {
    currentTime,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    onTimeChange,
    onPlayPause,
  } = useTimelineAnimation(timestamps);

  // Transform data to graph format
  const graphData = useGraphData(repo, timelineEvents, currentTime);

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
        <button
          onClick={handleRescan}
          disabled={rescanning}
          className="rescan-button"
        >
          {rescanning ? "Rescanning..." : "Rescan"}
        </button>
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
            <RepoGraph3D graphData={graphData} onNodeHover={handleNodeHover} />
          </div>

          {timestamps.length > 0 && (
            <GraphControls
              timestamps={timestamps}
              currentTime={currentTime}
              onTimeChange={onTimeChange}
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              playbackSpeed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
            />
          )}

          <NodeTooltip node={hoveredNode} position={mousePosition} />

          <div className="graph-stats">
            {graphData.nodes.length} / {timelineEvents.length + 1} nodes
          </div>
        </>
      )}
    </div>
  );
}

export default RepoPage;
