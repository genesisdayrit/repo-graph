import { useState } from "react";
import "./App.css";

function App() {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!path.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/list-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to list directory");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="container">
      <h1>Directory Creation Times</h1>

      <form onSubmit={handleSubmit} className="path-form">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Enter directory path (e.g., /Users/username/projects)"
          className="path-input"
        />
        <button type="submit" disabled={loading || !path.trim()}>
          {loading ? "Loading..." : "List Contents"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="results">
          <section>
            <h2>Directories ({result.directories.length})</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {result.directories.map((entry) => (
                    <tr key={entry.path}>
                      <td className="date">{formatDate(entry.createdAt)}</td>
                      <td className="path">{entry.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>Files ({result.files.length})</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {result.files.map((entry) => (
                    <tr key={entry.path}>
                      <td className="date">{formatDate(entry.createdAt)}</td>
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

export default App;
