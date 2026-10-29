import { getClerkUserId } from "@/middlewares/authenticate"
import { authService } from "@/services/auth.service"
import { ok } from "@/utils/api-response"
import { asyncHandler } from "@/utils/async-handler"

export const meController = {
  get: asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(getClerkUserId(req))
    ok(res, user)
  }),
}
