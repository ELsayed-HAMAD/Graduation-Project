import { Router } from "express"
import { authController } from "@/controllers/auth/auth.controller"
import { strictRateLimit } from "@/middlewares/rate-limit"
import { validate } from "@/middlewares/validate"
import { authSchemas } from "@/schemas/auth.schema"

export const authRoutes = Router()

authRoutes.post(
  "/sign-up",
  strictRateLimit,
  validate({ body: authSchemas.signUp }),
  authController.signUp,
)
authRoutes.post("/sign-in", authController.signIn)
