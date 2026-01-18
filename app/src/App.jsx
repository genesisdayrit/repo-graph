import { Routes, Route } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import RepoPage from "./pages/RepoPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/repos/:id" element={<RepoPage />} />
    </Routes>
  );
}

export default App;
