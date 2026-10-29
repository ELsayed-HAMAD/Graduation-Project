import { ERROR_CODES } from "@/constants/error-codes"
import { AppError, ConflictError, UnprocessableError } from "@/errors"
import { clerkClient } from "@/lib/clerk"
import { isUniqueViolation } from "@/repositories/base.repository"
import { userRepository, type UserWithProfile } from "@/repositories/user.repository"
import type { SignUpInput } from "@/schemas/auth.schema"
import type { AuthProfileDto, AuthUserDto } from "@/types/dto/auth.dto"

const toProfileDto = (user: UserWithProfile): AuthProfileDto | null => {
  if (user.parent) {
    const { email, isEmailVerified, mfaEnabled } = user.parent
    return { type: "PARENT", email, isEmailVerified, mfaEnabled }
  }

  const specialist = user.specialist
  if (specialist?.teacher) {
    const { school, subject } = specialist.teacher
    return {
      type: "TEACHER",
      email: specialist.email,
      organization: specialist.organization,
      school,
      subject,
    }
  }
  if (specialist?.doctor) {
    const { licenseNumber, clinic, specialty } = specialist.doctor
    return {
      type: "DOCTOR",
      email: specialist.email,
      organization: specialist.organization,
      licenseNumber,
      clinic,
      specialty,
    }
  }

  return null
}

const toAuthUserDto = (user: UserWithProfile): AuthUserDto => ({
  userId: user.userId,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
  profile: toProfileDto(user),
})

export const authService = {
  /**
   * Creates the local account for a Clerk user who just signed up with Google or Apple.
   * The email and its verification status are read from Clerk, never trusted from the client.
   */
  async signUp(clerkUserId: string, input: SignUpInput): Promise<AuthUserDto> {
    if (await userRepository.findByClerkUserId(clerkUserId)) {
      throw new ConflictError("This account is already registered. Sign in instead.")
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId)
    const primaryEmail = clerkUser.primaryEmailAddress
    if (!primaryEmail) {
      throw new UnprocessableError("Your Google or Apple account did not share an email address")
    }
    const email = primaryEmail.emailAddress.toLowerCase()

    if (await userRepository.emailExists(email)) {
      throw new ConflictError("An account with this email already exists")
    }
    if (
      input.role === "DOCTOR" &&
      (await userRepository.licenseNumberExists(input.licenseNumber))
    ) {
      throw new ConflictError("This license number is already registered")
    }

    try {
      const user = await userRepository.createWithProfile(
        input.role === "PARENT"
          ? {
              ...input,
              clerkUserId,
              email,
              isEmailVerified: primaryEmail.verification?.status === "verified",
              mfaEnabled: clerkUser.twoFactorEnabled,
            }
          : { ...input, clerkUserId, email },
      )
      return toAuthUserDto(user)
    } catch (err) {
      // Two sign-up requests raced past the checks above.
      if (isUniqueViolation(err)) throw new ConflictError("This account is already registered")
      throw err
    }
  },

  /** Returns the local account linked to a Clerk user, or 404 ACCOUNT_NOT_REGISTERED. */
  async getCurrentUser(clerkUserId: string): Promise<AuthUserDto> {
    const user = await userRepository.findByClerkUserId(clerkUserId)
    if (!user) {
      throw new AppError(
        404,
        ERROR_CODES.ACCOUNT_NOT_REGISTERED,
        "No account is linked to this sign-in yet. Complete sign-up first.",
      )
    }
    return toAuthUserDto(user)
  },
}
