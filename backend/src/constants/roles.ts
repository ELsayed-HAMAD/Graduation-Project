export const ROLES = {
  STUDENT: "STUDENT",
  PARENT: "PARENT",
  TEACHER: "TEACHER",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
