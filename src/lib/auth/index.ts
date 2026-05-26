import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authorizeUser } from './authorize'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email' },
        password: { label: 'Hasło', type: 'password' },
      },
      authorize: (credentials) =>
        authorizeUser(credentials as { email: string; password: string }),
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.tenantId = (user as { tenantId: string }).tenantId
        token.userId = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      session.user.tenantId = token.tenantId as string
      session.user.userId = token.userId as string
      session.user.role = token.role as string
      return session
    },
  },
})
