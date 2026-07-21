import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { createProfile } from '../db/profile'
import { seedDefaultExercises } from '../db/exercises'

export function AuthPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setSubmitting(false)
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      setSubmitting(false)
      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Profile and exercise library are created here, not in a DB trigger,
        // so a failure never blocks registration.
        try {
          await createProfile(data.user.id, null)
          await seedDefaultExercises(data.user.id)
        } catch (err) {
          console.error('Post-signup setup failed', err)
        }
      }
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="auth-screen">
      <h1>CoachSpace</h1>
      <p className="auth-subtitle">
        {mode === 'sign-in' ? 'Вход для тренеров' : 'Регистрация тренера'}
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Подождите...' : mode === 'sign-in' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>

      <button
        type="button"
        className="auth-switch"
        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
      >
        {mode === 'sign-in' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
      </button>

      <div className="auth-divider">или</div>

      <button type="button" className="auth-google" onClick={handleGoogleSignIn}>
        Войти через Google
      </button>
    </div>
  )
}
