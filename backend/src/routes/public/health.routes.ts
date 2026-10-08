import { Router } from "express"
import { healthController } from "@/controllers/public/health.controller"

export const healthRoutes = Router()

healthRoutes.get("/", healthController.check)
