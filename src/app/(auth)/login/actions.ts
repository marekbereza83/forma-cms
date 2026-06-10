'use server'
import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { prisma } from '@/lib/db/prisma'

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string) ?? ''

  if (email) {
    const row = await prisma.user.findUnique({
      where: { email },
      select: { lockedUntil: true },
    })
    if (row?.lockedUntil && row.lockedUntil > new Date()) {
      const mins = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000)
      return { error: `Za dużo nieudanych prób. Spróbuj ponownie za ${mins} min.` }
    }
  }

  try {
    await signIn('credentials', {
      email,
      password: formData.get('password'),
      redirect: false,
    })
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Nieprawidłowy email lub hasło.' }
    throw e
  }
  redirect('/dashboard')
}
