import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getProfile, updateProfile } from '../lib/profile'
import { listClients } from '../lib/clients'
import { supabase } from '../lib/supabase'
import { logEvent } from '../lib/analytics'

export function ProfilePage() {
  const { session } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [clientCount, setClientCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    logEvent('profile_viewed')
    Promise.all([getProfile(), listClients()])
      .then(([profile, clients]) => {
        setFirstName(profile.first_name ?? '')
        setLastName(profile.last_name ?? '')
        setClientCount(clients.length)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить профиль'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateProfile({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      })
      logEvent('profile_updated')
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="clients-screen">
        <div className="clients-placeholder">Загрузка…</div>
      </div>
    )
  }

  return (
    <div className="clients-screen">
      <header className="home-header">
        <span>Профиль</span>
        {!editing && (
          <button
            type="button"
            className="icon-button"
            aria-label="Редактировать профиль"
            onClick={() => setEditing(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </header>

      <div className="profile-body">
        {editing ? (
          <>
            <label>
              Имя
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label>
              Фамилия
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Отмена
              </button>
              <button type="button" disabled={saving} onClick={handleSave}>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="profile-field">
              <span className="profile-field-label">Имя</span>
              <span className="profile-field-value">{firstName || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Фамилия</span>
              <span className="profile-field-value">{lastName || '—'}</span>
            </div>
            {error && <p className="auth-error">{error}</p>}
          </>
        )}

        <div className="profile-field">
          <span className="profile-field-label">Email</span>
          <span className="profile-field-value">{session?.user.email ?? '—'}</span>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Спортсменов</span>
          <span className="profile-field-value">{clientCount ?? 0}</span>
        </div>
      </div>

      <button type="button" className="profile-signout" onClick={() => supabase.auth.signOut()}>
        Выйти
      </button>
    </div>
  )
}
