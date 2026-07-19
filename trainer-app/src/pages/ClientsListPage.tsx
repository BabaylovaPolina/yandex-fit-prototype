import { useEffect, useState } from 'react'
import { listClients, type Client } from '../lib/clients'
import { logEvent } from '../lib/analytics'
import { supabase } from '../lib/supabase'

const genderLabel: Record<Client['gender'], string> = {
  male: 'М',
  female: 'Ж',
}

type Props = {
  onAddClient: () => void
  onOpenClient: (client: Client) => void
  onEditClient: (client: Client) => void
  refreshKey: number
}

export function ClientsListPage({ onAddClient, onOpenClient, onEditClient, refreshKey }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    logEvent('clients_list_viewed')
    setLoading(true)
    listClients()
      .then(setClients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [refreshKey])

  return (
    <div className="clients-screen">
      <header className="home-header">
        <span>Мои клиенты</span>
        <button type="button" onClick={onAddClient}>
          + Клиент
        </button>
        <button type="button" onClick={() => supabase.auth.signOut()}>
          Выйти
        </button>
      </header>

      {loading && <div className="clients-placeholder">Загрузка…</div>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && clients.length === 0 && (
        <div className="clients-placeholder">
          Пока нет ни одного клиента. Добавьте первого.
        </div>
      )}

      {!loading && clients.length > 0 && (
        <ul className="clients-list">
          {clients.map((client) => (
            <li key={client.id} className="clients-list-item">
              <button
                type="button"
                className="workout-card-open"
                onClick={() => onOpenClient(client)}
              >
                <span className="clients-list-name">{client.full_name}</span>
                <span className="clients-list-meta">
                  {genderLabel[client.gender]}, {client.age} лет · {client.height_cm} см ·{' '}
                  {client.weight_kg} кг
                </span>
              </button>
              <button
                type="button"
                className="clients-list-edit"
                aria-label="Редактировать клиента"
                onClick={() => onEditClient(client)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
