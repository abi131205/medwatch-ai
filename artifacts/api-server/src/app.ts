import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrations";
import { runSeed } from "./lib/seed";
import { runClusterDetection } from "./lib/clusterDetection";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

runMigrations()
  .then(() => runSeed())
  .then(() => {
    setTimeout(() => {
      runClusterDetection().catch((err) => logger.error(err, "Initial cluster detection failed"));
    }, 3000);
    setInterval(() => {
      runClusterDetection().catch((err) => logger.error(err, "Scheduled cluster detection failed"));
    }, 5 * 60 * 1000);
  })
  .catch((err) => logger.error(err, "Startup failed"));

export default app;
