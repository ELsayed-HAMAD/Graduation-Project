import { healthRepository } from "@/repositories/health.repository"
import type { HealthDto } from "@/types/dto/health.dto"

export const healthService = {
  async check(): Promise<HealthDto> {
    const database = await healthRepository
      .ping()
      .then(() => "up" as const)
      .catch(() => "down" as const)

    return {
      status: database === "up" ? "ok" : "degraded",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database,
    }
  },
}
