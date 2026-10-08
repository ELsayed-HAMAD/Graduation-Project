import type { CorsOptions } from "cors"
import { env } from "./env"

const allowedOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

export const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
}
