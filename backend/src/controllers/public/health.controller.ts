import { healthService } from "@/services/health.service"
import { asyncHandler } from "@/utils/async-handler"

export const healthController = {
  check: asyncHandler(async (_req, res) => {
    const health = await healthService.check()
    res.status(health.status === "ok" ? 200 : 503).json({ data: health })
  }),
}
