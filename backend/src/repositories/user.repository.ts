import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { Db } from "./base.repository"

const withProfile = {
  parent: true,
  specialist: { include: { teacher: true, doctor: true } },
} satisfies Prisma.UserInclude

export type UserWithProfile = Prisma.UserGetPayload<{ include: typeof withProfile }>

interface NewClerkUserBase {
  clerkUserId: string
  email: string
}

export type NewClerkUser = NewClerkUserBase &
  (
    | { role: "PARENT"; isEmailVerified: boolean; mfaEnabled: boolean }
    | { role: "TEACHER"; organization?: string; school?: string; subject?: string }
    | {
        role: "DOCTOR"
        organization?: string
        licenseNumber: string
        clinic?: string
        specialty?: string
      }
  )

/** Builds the nested create so the user and its role profile are written in one query. */
const toCreateData = (input: NewClerkUser): Prisma.UserCreateInput => {
  const base = { clerkUserId: input.clerkUserId, role: input.role }

  switch (input.role) {
    case "PARENT":
      return {
        ...base,
        parent: {
          create: {
            email: input.email,
            isEmailVerified: input.isEmailVerified,
            mfaEnabled: input.mfaEnabled,
          },
        },
      }
    case "TEACHER":
      return {
        ...base,
        specialist: {
          create: {
            specialistType: "TEACHER",
            email: input.email,
            organization: input.organization ?? null,
            teacher: { create: { school: input.school ?? null, subject: input.subject ?? null } },
          },
        },
      }
    case "DOCTOR":
      return {
        ...base,
        specialist: {
          create: {
            specialistType: "DOCTOR",
            email: input.email,
            organization: input.organization ?? null,
            doctor: {
              create: {
                licenseNumber: input.licenseNumber,
                clinic: input.clinic ?? null,
                specialty: input.specialty ?? null,
              },
            },
          },
        },
      }
  }
}

export const userRepository = {
  findByClerkUserId: (clerkUserId: string, db: Db = prisma) =>
    db.user.findUnique({ where: { clerkUserId }, include: withProfile }),

  /** Parent and specialist emails are each unique; an email may not be used by both. */
  emailExists: async (email: string, db: Db = prisma) => {
    const [parent, specialist] = await Promise.all([
      db.parent.findUnique({ where: { email }, select: { userId: true } }),
      db.specialist.findUnique({ where: { email }, select: { userId: true } }),
    ])
    return Boolean(parent ?? specialist)
  },

  licenseNumberExists: async (licenseNumber: string, db: Db = prisma) =>
    Boolean(await db.doctor.findUnique({ where: { licenseNumber }, select: { userId: true } })),

  createWithProfile: (input: NewClerkUser, db: Db = prisma) =>
    db.user.create({ data: toCreateData(input), include: withProfile }),
}
