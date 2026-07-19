import { useEffect, useState } from 'react'
import { listWorkoutsForDate, type WorkoutWithClientName } from '../lib/workouts'
import { logEvent } from '../lib/analytics'

const DAY_LABELS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']

const statusLabel: Record<WorkoutWithClientName['status'], string> = {
  planned: 'Запланирована',
  done: 'Выполнена',
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  result.setDate(result.getDate() - day)
  result.setHours(0, 0, 0, 0)
  return result
}

function formatTimeRange(workout: WorkoutWithClientName): string {
  if (!workout.start_time) return ''
  const start = workout.start_time.slice(0, 5)
  if (!workout.end_time) return start
  return `${start}–${workout.end_time.slice(0, 5)}`
}

type Props = {
  onAddWorkout: (dateKey: string) => void
  onOpenClient: (clientId: number) => void
  refreshKey: number
}

export function SchedulePage({ onAddWorkout, onOpenClient, refreshKey }: Props) {
  const todayKey = toDateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [workouts, setWorkouts] = useState<WorkoutWithClientName[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    logEvent('schedule_viewed', { date: selectedDate })
    setLoading(true)
    listWorkoutsForDate(selectedDate)
      .then(setWorkouts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить расписание'))
      .finally(() => setLoading(false))
  }, [selectedDate, refreshKey])

  const weekStart = startOfWeek(new Date(selectedDate + 'T00:00:00'))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="clients-screen">
      <header className="home-header">
        <span>Расписание</span>
        <button type="button" onClick={() => onAddWorkout(selectedDate)}>
          + Тренировка
        </button>
      </header>

      <div className="week-strip">
        {weekDays.map((day) => {
          const key = toDateKey(day)
          const isActive = key === selectedDate
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              className={isActive ? 'week-day active' : 'week-day'}
              onClick={() => setSelectedDate(key)}
            >
              <span className="day-label">{DAY_LABELS[day.getDay()]}</span>
              <span className={isToday ? 'day-num today' : 'day-num'}>{day.getDate()}</span>
            </button>
          )
        })}
      </div>

      {loading && <div className="clients-placeholder">Загрузка…</div>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && workouts.length === 0 && (
        <div className="clients-placeholder">
          Тренировок нет
          <br />
          <button type="button" onClick={() => onAddWorkout(selectedDate)}>
            + Запланировать тренировку
          </button>
        </div>
      )}

      {!loading && workouts.length > 0 && (
        <ul className="clients-list">
          {workouts.map((workout) => (
            <li key={workout.id} className="clients-list-item">
              <button
                type="button"
                className="workout-card-open"
                onClick={() => onOpenClient(workout.client_id)}
              >
                <span className="clients-list-name">
                  {formatTimeRange(workout)} · {workout.client_name}
                </span>
                <span className="clients-list-meta">{statusLabel[workout.status]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
