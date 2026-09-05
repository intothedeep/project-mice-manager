import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env["PORT"] ?? 3002;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.warn(`colony_server listening on port ${PORT}`);
});
