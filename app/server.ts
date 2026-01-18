import express from "express";
import ViteExpress from "vite-express";
import { listCreationTimes } from "./src/server/listCreationTimes";

const app = express();

app.use(express.json());

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the server!" });
});

app.post("/api/list-directory", async (req, res) => {
  const { path } = req.body;

  if (!path || typeof path !== "string") {
    res.status(400).json({ error: "Path is required" });
    return;
  }

  try {
    const result = await listCreationTimes(path);
    res.json(result);
  } catch (err) {
    console.error("Error listing directory:", err);
    res.status(500).json({ error: `Failed to list directory: ${err}` });
  }
});

ViteExpress.listen(app, 3000, () => {
  console.log("Server running at http://localhost:3000");
});
