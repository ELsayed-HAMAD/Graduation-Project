import { Router } from "express"
import { meController } from "@/controllers/account/me.controller"

export const meRoutes = Router()

meRoutes.get("/", meController.get)
