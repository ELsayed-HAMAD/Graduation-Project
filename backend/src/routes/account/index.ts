import { Router } from "express"
import { meRoutes } from "./me.routes"

/** Routes for any authenticated user. Mount feature routers here. */
export const accountRouter = Router()

accountRouter.use("/me", meRoutes)
