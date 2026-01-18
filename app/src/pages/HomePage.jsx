import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

function HomePage() {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const response = await fetch("/api/repos");
      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      }
    } catch (err) {
      console.error("Error fetching repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!path.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create repo");
      }

      navigate(`/repos/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Repo Graph</h1>

      <form onSubmit={handleSubmit} className="path-form">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Enter directory path (e.g., /Users/username/projects)"
          className="path-input"
        />
        <button type="submit" disabled={loading || !path.trim()}>
          {loading ? "Creating..." : "Create Repo Graph"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {repos.length > 0 && (
        <section className="repos-section">
          <h2>Existing Repos</h2>
          <ul className="repos-list">
            {repos.map((repo) => (
              <li key={repo.id} className="repo-item">
                <Link to={`/repos/${repo.id}`} className="repo-link">
                  {repo.path}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loadingRepos && <p className="loading-text">Loading repos...</p>}
      {!loadingRepos && repos.length === 0 && (
        <p className="empty-text">No repos yet. Add one above!</p>
      )}
    </div>
  );
}

export default HomePage;
