import { z } from "zod"
import { ROLES } from "@/constants/roles"

const optionalText = z.string().trim().min(1).max(200).optional()

export const authSchemas = {
  /** The email comes from the Clerk account (Google / Apple), never from the body. */
  signUp: z.discriminatedUnion("role", [
    z.object({ role: z.literal(ROLES.PARENT) }),
    z.object({
      role: z.literal(ROLES.TEACHER),
      organization: optionalText,
      school: optionalText,
      subject: optionalText,
    }),
    z.object({
      role: z.literal(ROLES.DOCTOR),
      licenseNumber: z.string().trim().min(3).max(100),
      organization: optionalText,
      clinic: optionalText,
      specialty: optionalText,
    }),
  ]),
}

export type SignUpInput = z.infer<typeof authSchemas.signUp>
