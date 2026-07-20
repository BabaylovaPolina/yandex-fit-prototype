import { useEffect, useMemo, useState } from 'react'
import { listWorkoutsWithSummary, type WorkoutWithSummary } from '../lib/workouts'
import { type Client } from '../lib/clients'
import { MUSCLE_GROUP_LABELS } from '../lib/exercises'
import { logEvent } from '../lib/analytics'

const genderLabel: Record<Client['gender'], string> = {
  male: 'М',
  female: 'Ж',
}

function formatSummary(workout: WorkoutWithSummary): string {
  if (workout.muscleGroups.length === 0) return 'Без упражнений'
  return workout.muscleGroups.map((group) => MUSCLE_GROUP_LABELS[group]).join(' · ')
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateRu(dateKey: string): string {
  const [year, month, day] = dateKey.split('-')
  return `${day}.${month}.${year.slice(2)}`
}

type Props = {
  client: Client
  onBack: () => void
  onAddWorkout: () => void
  onOpenWorkout: (workoutId: number) => void
  onCopyWorkout: (workoutId: number) => void
}

export function ClientDetailPage({
  client,
  onBack,
  onAddWorkout,
  onOpenWorkout,
  onCopyWorkout,
}: Props) {
  const [workouts, setWorkouts] = useState<WorkoutWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const todaysWorkout = useMemo(
    () => workouts.find((w) => w.workout_date === todayKey() && w.status === 'planned'),
    [workouts],
  )
  const upcoming = useMemo(
    () => workouts.filter((w) => w.workout_date >= todayKey() && w.status === 'planned').reverse(),
    [workouts],
  )
  const history = useMemo(
    () => workouts.filter((w) => w.workout_date < todayKey() || w.status === 'done'),
    [workouts],
  )

  function renderCopyButton(workout: WorkoutWithSummary) {
    return (
      <button
        type="button"
        className="icon-button workout-copy-button"
        onClick={() => onCopyWorkout(workout.id)}
        title="Копировать тренировку"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M8 21h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    )
  }

  function renderUpcomingItem(workout: WorkoutWithSummary) {
    return (
      <li key={workout.id} className="clients-list-item">
        <button type="button" className="workout-card-open" onClick={() => onOpenWorkout(workout.id)}>
          <span className="clients-list-name">{formatDateRu(workout.workout_date)}</span>
          <span className="clients-list-meta">{formatSummary(workout)}</span>
        </button>
        {renderCopyButton(workout)}
      </li>
    )
  }

  function renderHistoryItem(workout: WorkoutWithSummary) {
    const done = workout.status === 'done'
    return (
      <li key={workout.id} className="clients-list-item">
        <button type="button" className="workout-card-open" onClick={() => onOpenWorkout(workout.id)}>
          <span className="clients-list-name">
            <span
              className={done ? 'workout-status-dot done' : 'workout-status-dot missed'}
              title={done ? 'Выполнена' : 'Не выполнена'}
            />
            {formatDateRu(workout.workout_date)}
          </span>
          <span className="clients-list-meta">{formatSummary(workout)}</span>
        </button>
        {renderCopyButton(workout)}
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

      <div className="client-detail-scroll">
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
            <ul className="clients-list">{upcoming.map(renderUpcomingItem)}</ul>
          </>
        )}

        {!loading && !error && history.length > 0 && (
          <>
            <div className="client-detail-section-title">История</div>
            <ul className="clients-list">{history.map(renderHistoryItem)}</ul>
          </>
        )}
      </div>
    </div>
  )
}
