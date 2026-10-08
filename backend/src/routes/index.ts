import { Router } from "express"
import { accountRouter } from "./account"
import { adminRouter } from "./admin"
import { publicRouter } from "./public"

/** Mounts every area under /api/v1 (see app.ts). */
export const router = Router()

router.use("/", publicRouter)
// TODO: add `authenticate` (and `requireRole(...)` for admin) once the auth provider is chosen.
router.use("/account", accountRouter)
router.use("/admin", adminRouter)
