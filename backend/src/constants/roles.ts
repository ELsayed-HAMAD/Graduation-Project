/** Mirrors the `UserRole` enum in prisma/schema.prisma. */
export const ROLES = {
  LEARNER: "LEARNER",
  PARENT: "PARENT",
  TEACHER: "TEACHER",
  DOCTOR: "DOCTOR",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Roles that can create their own account through Clerk (Google / Apple).
 * Learners are child accounts and are created by their parent instead.
 */
export const SIGN_UP_ROLES = [ROLES.PARENT, ROLES.TEACHER, ROLES.DOCTOR] as const

export type SignUpRole = (typeof SIGN_UP_ROLES)[number]
