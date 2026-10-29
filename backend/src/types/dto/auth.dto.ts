import type { Role } from "@/constants/roles"

export type AuthProfileDto =
  | { type: "PARENT"; email: string; isEmailVerified: boolean; mfaEnabled: boolean }
  | {
      type: "TEACHER"
      email: string
      organization: string | null
      school: string | null
      subject: string | null
    }
  | {
      type: "DOCTOR"
      email: string
      organization: string | null
      licenseNumber: string
      clinic: string | null
      specialty: string | null
    }

export interface AuthUserDto {
  userId: string
  role: Role
  createdAt: string
  profile: AuthProfileDto | null
}
