import { Router } from "express"
import { authRoutes } from "./auth.routes"

/**
 * Routes for a Clerk-signed-in user who may not have a local account yet
 * (sign-up creates it). Mounted behind `authenticate` in routes/index.ts.
 */
export const authRouter = Router()

authRouter.use("/", authRoutes)
