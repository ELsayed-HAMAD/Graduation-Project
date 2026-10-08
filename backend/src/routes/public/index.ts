import { Router } from "express"
import { healthRoutes } from "./health.routes"

/** Routes that need no authentication. */
export const publicRouter = Router()

publicRouter.use("/health", healthRoutes)
