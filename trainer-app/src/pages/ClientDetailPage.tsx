import { useEffect, useState } from 'react'
import { listWorkouts, copyWorkout, type Workout } from '../lib/workouts'
import { type Client } from '../lib/clients'
import { logEvent } from '../lib/analytics'

const genderLabel: Record<Client['gender'], string> = {
  male: 'М',
  female: 'Ж',
}

const statusLabel: Record<Workout['status'], string> = {
  planned: 'Запланирована',
  done: 'Выполнена',
}

type Props = {
  client: Client
  onBack: () => void
  onAddWorkout: () => void
  onOpenWorkout: (workoutId: number) => void
}

export function ClientDetailPage({ client, onBack, onAddWorkout, onOpenWorkout }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<number | null>(null)

  function reload() {
    setLoading(true)
    listWorkouts(client.id)
      .then(setWorkouts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    logEvent('client_detail_viewed', { client_id: client.id })
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id])

  async function handleCopy(workoutId: number) {
    setCopyingId(workoutId)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await copyWorkout(workoutId, today)
      logEvent('workout_copied', { workout_id: workoutId })
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось скопировать тренировку')
    } finally {
      setCopyingId(null)
    }
  }

  return (
    <div className="clients-screen">
      <header className="home-header">
        <button type="button" onClick={onBack}>
          Назад
        </button>
        <span>{client.full_name}</span>
      </header>

      <div className="client-detail-meta">
        {genderLabel[client.gender]}, {client.age} лет · {client.height_cm} см · {client.weight_kg} кг
      </div>

      <div className="client-detail-actions">
        <button type="button" onClick={onAddWorkout}>
          + Тренировка
        </button>
      </div>

      {loading && <div className="clients-placeholder">Загрузка…</div>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && workouts.length === 0 && (
        <div className="clients-placeholder">Пока нет ни одной тренировки.</div>
      )}

      {!loading && workouts.length > 0 && (
        <ul className="clients-list">
          {workouts.map((workout) => (
            <li key={workout.id} className="clients-list-item">
              <button
                type="button"
                className="workout-card-open"
                onClick={() => onOpenWorkout(workout.id)}
              >
                <span className="clients-list-name">{workout.workout_date}</span>
                <span className="clients-list-meta">{statusLabel[workout.status]}</span>
              </button>
              <button
                type="button"
                className="workout-copy-button"
                disabled={copyingId === workout.id}
                onClick={() => handleCopy(workout.id)}
              >
                {copyingId === workout.id ? 'Копирование…' : 'Копировать'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
