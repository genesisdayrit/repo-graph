import { useState } from "react";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
    </div>
  );
}

export default HomePage;
