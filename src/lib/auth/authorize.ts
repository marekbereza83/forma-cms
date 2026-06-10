import bcrypt from 'bcryptjs'
import { prisma } from '../db/prisma'

export type AuthUser = {
  id: string
  email: string
  tenantId: string
  role: string
}

const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 15 * 60 * 1000

// Exported standalone so it can be unit-tested without NextAuth infrastructure.
export async function authorizeUser(credentials: {
  email: string
  password: string
}): Promise<AuthUser | null> {
  if (!credentials?.email || !credentials?.password) return null

  const user = await prisma.user.findUnique({ where: { email: credentials.email } })
  if (!user) return null

  if (user.lockedUntil && user.lockedUntil > new Date()) return null

  const ok = await bcrypt.compare(credentials.password, user.password)

  if (!ok) {
    const newCount = user.failedLoginAttempts + 1
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newCount,
        ...(newCount >= MAX_ATTEMPTS ? { lockedUntil: new Date(Date.now() + LOCKOUT_MS) } : {}),
      },
    })
    return null
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    })
  }

  return { id: user.id, email: user.email, tenantId: user.tenantId, role: user.role }
}
