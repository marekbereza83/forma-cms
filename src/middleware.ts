import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: ['/dashboard', '/edit/:path*', '/preview', '/api/upload', '/api/export/:path*'],
}
