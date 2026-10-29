import { Router } from "express"
import { authenticate } from "@/middlewares/authenticate"
import { accountRouter } from "./account"
import { adminRouter } from "./admin"
import { authRouter } from "./auth"
import { publicRouter } from "./public"

/** Mounts every area under /api/v1 (see app.ts). */
export const router = Router()

router.use("/", publicRouter)
// Clerk session required, local account not yet (sign-up creates it).
router.use("/auth", authenticate, authRouter)
router.use("/account", authenticate, accountRouter)
// TODO: add `requireRole(...)` for admin once roles are stored for Clerk users.
router.use("/admin", authenticate, adminRouter)
