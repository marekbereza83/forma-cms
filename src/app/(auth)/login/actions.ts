'use server'
import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

export async function loginAction(formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: 'Nieprawidłowy email lub hasło.' }
    }
    throw e
  }
  redirect('/dashboard')
}
