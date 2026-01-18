import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

function RepoPage() {
  const { id } = useParams();
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState(null);
  const [rescanning, setRescanning] = useState(false);

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

  // Fetch events when repo is loaded
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
        <Link to="/" className="back-link">&larr; Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <Link to="/" className="back-link">&larr; Back</Link>

      <div className="repo-header">
        <h1>{repo.name}</h1>
        <button
          onClick={handleRescan}
          disabled={rescanning}
          className="rescan-button"
        >
          {rescanning ? "Rescanning..." : "Rescan"}
        </button>
      </div>
      <p className="repo-path">{repo.path}</p>

      {error && <div className="error">{error}</div>}

      {events && (
        <div className="results">
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
    </div>
  );
}

export default RepoPage;
