import cors from "cors";
import "dotenv/config";
import express from "express";
import helmet from "helmet";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "albania-rides-api"
  });
});

app.get("/api/v1", (_req, res) => {
  res.json({
    name: "Albania Rides API",
    version: "0.1.0"
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
