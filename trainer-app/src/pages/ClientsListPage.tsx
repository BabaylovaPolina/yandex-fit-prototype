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
  refreshKey: number
}

export function ClientsListPage({ onAddClient, refreshKey }: Props) {
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
        <span>Спортсмены</span>
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
              <span className="clients-list-name">{client.full_name}</span>
              <span className="clients-list-meta">
                {genderLabel[client.gender]}, {client.age} лет · {client.height_cm} см ·{' '}
                {client.weight_kg} кг
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
