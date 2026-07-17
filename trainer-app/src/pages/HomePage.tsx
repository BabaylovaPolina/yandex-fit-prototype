import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logEvent } from '../lib/analytics'

export function HomePage() {
  useEffect(() => {
    logEvent('home_viewed')
  }, [])

  return (
    <div className="home-screen">
      <header className="home-header">
        <span>CoachSpace</span>
        <button type="button" onClick={() => supabase.auth.signOut()}>
          Выйти
        </button>
      </header>
      <div className="home-placeholder">Здесь скоро появится главный экран</div>
    </div>
  )
}
