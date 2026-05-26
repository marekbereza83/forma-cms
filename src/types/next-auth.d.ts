import 'next-auth'

declare module 'next-auth' {
  interface User {
    tenantId: string
    role: string
  }
  interface Session {
    user: {
      id: string
      email: string
      tenantId: string
      userId: string
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId: string
    userId: string
    role: string
  }
}
