import express from "express";
import cors from "cors";

import { ridesRouter } from "./routes/rides";
import { driversRouter } from "./routes/drivers";
import { paymentsRouter } from "./routes/payments";
import { webhooksRouter } from "./routes/webhooks";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());

app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhooksRouter,
);

app.use(express.json());
app.use("/api/rides", ridesRouter);
app.use("/api/drivers", driversRouter);
app.use("/api/payments", paymentsRouter);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    status: "healthy",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
