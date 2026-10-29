import { getClerkUserId } from "@/middlewares/authenticate"
import type { SignUpInput } from "@/schemas/auth.schema"
import { authService } from "@/services/auth.service"
import { created, ok } from "@/utils/api-response"
import { asyncHandler } from "@/utils/async-handler"

export const authController = {
  signUp: asyncHandler(async (req, res) => {
    const user = await authService.signUp(getClerkUserId(req), req.body as SignUpInput)
    created(res, user)
  }),

  signIn: asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(getClerkUserId(req))
    ok(res, user)
  }),
}
