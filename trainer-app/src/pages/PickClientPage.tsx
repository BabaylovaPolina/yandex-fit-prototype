import { useEffect, useState } from 'react'
import { listClients, type Client } from '../api/clients'

type Props = {
  onPick: (client: Client) => void
  onCancel: () => void
}

export function PickClientPage({ onPick, onCancel }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить клиентов'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="clients-screen">
      <header className="home-header">
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
        <span>Выберите клиента</span>
      </header>

      {loading && <div className="clients-placeholder">Загрузка…</div>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && clients.length === 0 && (
        <div className="clients-placeholder">Сначала добавьте клиента</div>
      )}

      {!loading && clients.length > 0 && (
        <ul className="clients-list">
          {clients.map((client) => (
            <li key={client.id} className="clients-list-item">
              <button
                type="button"
                className="workout-card-open"
                onClick={() => onPick(client)}
              >
                <span className="clients-list-name">{client.full_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
