import { Router, type IRouter } from "express";
import healthRouter from "./health";
import signalsRouter from "./signals";
import alertsRouter from "./alerts";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/signals", signalsRouter);
router.use("/alerts", alertsRouter);
router.use("/analytics", analyticsRouter);

export default router;
