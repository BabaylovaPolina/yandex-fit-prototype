import { useEffect, useMemo, useState } from 'react'
import { listWorkoutsWithSummary, copyWorkout, type WorkoutWithSummary } from '../lib/workouts'
import { type Client } from '../lib/clients'
import { logEvent } from '../lib/analytics'

const genderLabel: Record<Client['gender'], string> = {
  male: 'М',
  female: 'Ж',
}

const statusLabel: Record<WorkoutWithSummary['status'], string> = {
  planned: 'Запланирована',
  done: 'Выполнена',
}

function formatSummary(workout: WorkoutWithSummary): string {
  if (workout.exerciseSummary.length === 0) return 'Без упражнений'
  return workout.exerciseSummary
    .map((ex) => `${ex.exercise_name} ×${ex.set_count}`)
    .join(' · ')
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

type Props = {
  client: Client
  onBack: () => void
  onAddWorkout: () => void
  onOpenWorkout: (workoutId: number) => void
}

export function ClientDetailPage({ client, onBack, onAddWorkout, onOpenWorkout }: Props) {
  const [workouts, setWorkouts] = useState<WorkoutWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<number | null>(null)

  function reload() {
    setLoading(true)
    listWorkoutsWithSummary(client.id)
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
      const today = todayKey()
      await copyWorkout(workoutId, today)
      logEvent('workout_copied', { workout_id: workoutId })
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось скопировать тренировку')
    } finally {
      setCopyingId(null)
    }
  }

  const todaysWorkout = useMemo(
    () => workouts.find((w) => w.workout_date === todayKey() && w.status === 'planned'),
    [workouts],
  )
  const upcoming = useMemo(
    () => workouts.filter((w) => w.workout_date >= todayKey()).reverse(),
    [workouts],
  )
  const history = useMemo(
    () => workouts.filter((w) => w.workout_date < todayKey()),
    [workouts],
  )

  function renderWorkoutItem(workout: WorkoutWithSummary) {
    return (
      <li key={workout.id} className="clients-list-item">
        <button type="button" className="workout-card-open" onClick={() => onOpenWorkout(workout.id)}>
          <span className="clients-list-name">
            {workout.workout_date} · {statusLabel[workout.status]}
          </span>
          <span className="clients-list-meta">{formatSummary(workout)}</span>
        </button>
        <button
          type="button"
          className="workout-copy-button"
          disabled={copyingId === workout.id}
          onClick={() => handleCopy(workout.id)}
          title="Копировать тренировку"
        >
          {copyingId === workout.id ? '⏳' : '📋'}
        </button>
      </li>
    )
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
        {todaysWorkout ? (
          <button type="button" onClick={() => onOpenWorkout(todaysWorkout.id)}>
            Тренировка на сегодня
          </button>
        ) : (
          <button type="button" onClick={onAddWorkout}>
            + Тренировка
          </button>
        )}
      </div>

      {loading && <div className="clients-placeholder">Загрузка…</div>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && workouts.length === 0 && (
        <div className="clients-placeholder">Пока нет ни одной тренировки.</div>
      )}

      {!loading && !error && upcoming.length > 0 && (
        <>
          <div className="client-detail-section-title">Предстоит</div>
          <ul className="clients-list">{upcoming.map(renderWorkoutItem)}</ul>
        </>
      )}

      {!loading && !error && history.length > 0 && (
        <>
          <div className="client-detail-section-title">История</div>
          <ul className="clients-list">{history.map(renderWorkoutItem)}</ul>
        </>
      )}
    </div>
  )
}
