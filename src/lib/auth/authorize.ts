import bcrypt from 'bcryptjs'
import { prisma } from '../db/prisma'

export type AuthUser = {
  id: string
  email: string
  tenantId: string
  role: string
}

// Exported standalone so it can be unit-tested without NextAuth infrastructure.
export async function authorizeUser(credentials: {
  email: string
  password: string
}): Promise<AuthUser | null> {
  if (!credentials?.email || !credentials?.password) return null

  const user = await prisma.user.findUnique({ where: { email: credentials.email } })
  if (!user) return null

  const valid = await bcrypt.compare(credentials.password, user.password)
  if (!valid) return null

  return { id: user.id, email: user.email, tenantId: user.tenantId, role: user.role }
}
