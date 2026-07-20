import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { createProfile } from './profile'
import { seedDefaultExercises } from './exercises'

type AuthContextValue = {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true })

async function ensureTrainerSetup(userId: string, fullName: string | null) {
  try {
    await createProfile(userId, fullName)
    await seedDefaultExercises(userId)
  } catch (err) {
    console.error('ensureTrainerSetup failed', err)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      // Handle Google OAuth and other OAuth providers: profile + exercises may not exist yet
      if (event === 'SIGNED_IN' && newSession?.user) {
        const { id, user_metadata } = newSession.user
        ensureTrainerSetup(id, user_metadata?.full_name ?? null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
