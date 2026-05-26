'use client'
import { useActionState } from 'react'
import { loginAction } from './actions'

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(
    async (_: unknown, formData: FormData) => loginAction(formData),
    null,
  )

  return (
    <div className="login-shell">
      <div className="login-card">
        <p className="login-brand">FORMA</p>

        <form action={formAction}>
          <div className="field-row">
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div className="field-row">
            <label className="field-label" htmlFor="password">Hasło</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {state?.error && (
            <div className="alert-error">{state.error}</div>
          )}

          <div style={{ marginTop: '24px' }}>
            <button type="submit" className="btn" style={{ width: '100%' }} disabled={pending}>
              {pending ? 'Logowanie…' : 'Zaloguj się'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
