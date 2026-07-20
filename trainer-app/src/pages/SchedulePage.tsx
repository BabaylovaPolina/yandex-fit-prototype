import { useEffect, useMemo, useRef, useState } from 'react'
import { listWorkoutsForDate, type WorkoutWithClientName } from '../api/workouts'
import { logEvent } from '../lib/analytics'
import { MonthPickerSheet } from '../components/MonthPickerSheet'

const DAY_LABELS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 56

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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
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
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [workouts, setWorkouts] = useState<WorkoutWithClientName[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEvent('schedule_viewed', { date: selectedDate })
    setLoading(true)
    listWorkoutsForDate(selectedDate)
      .then(setWorkouts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить расписание'))
      .finally(() => setLoading(false))
  }, [selectedDate, refreshKey])

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        return d
      }),
    [weekStart],
  )

  function goToWeek(offsetWeeks: number) {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + offsetWeeks * 7)
    setWeekStart(next)
  }

  function selectDateFromMonth(date: Date) {
    setWeekStart(startOfWeek(date))
    setSelectedDate(toDateKey(date))
    setMonthPickerOpen(false)
  }

  const timedWorkouts = workouts.filter((w) => w.start_time)
  const untimedWorkouts = workouts.filter((w) => !w.start_time)

  useEffect(() => {
    if (loading || !scrollRef.current) return
    const firstWorkoutMinutes =
      timedWorkouts.length > 0 ? timeToMinutes(timedWorkouts[0].start_time!.slice(0, 5)) : null
    const targetMinutes =
      firstWorkoutMinutes !== null ? Math.min(firstWorkoutMinutes, 7 * 60) : 7 * 60
    scrollRef.current.scrollTop = (targetMinutes / 60) * HOUR_HEIGHT
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedDate])

  return (
    <div className="clients-screen">
      <header className="home-header">
        <button type="button" onClick={() => onAddWorkout(selectedDate)}>
          + Тренировка
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => setMonthPickerOpen(true)}
          aria-label="Открыть календарь"
        >
          📅
        </button>
      </header>

      <div className="week-nav">
        <button type="button" className="week-nav-arrow" onClick={() => goToWeek(-1)} aria-label="Предыдущая неделя">
          ‹
        </button>
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
        <button type="button" className="week-nav-arrow" onClick={() => goToWeek(1)} aria-label="Следующая неделя">
          ›
        </button>
      </div>

      {loading && <div className="clients-placeholder">Загрузка…</div>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && workouts.length === 0 && (
        <div className="clients-placeholder">
          Тренировок нет
          <button type="button" onClick={() => onAddWorkout(selectedDate)}>
            + Запланировать тренировку
          </button>
        </div>
      )}

      {!loading && !error && workouts.length > 0 && (
        <div className="day-grid-scroll" ref={scrollRef}>
          {untimedWorkouts.length > 0 && (
            <ul className="clients-list day-grid-untimed">
              {untimedWorkouts.map((workout) => (
                <li key={workout.id} className="clients-list-item">
                  <button
                    type="button"
                    className="workout-card-open"
                    onClick={() => onOpenClient(workout.client_id)}
                  >
                    <span className="clients-list-name">{workout.client_name}</span>
                    <span className="clients-list-meta">без времени</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="day-grid" style={{ height: HOURS.length * HOUR_HEIGHT }}>
            {HOURS.map((hour) => (
              <div key={hour} className="day-grid-hour" style={{ top: hour * HOUR_HEIGHT }}>
                <span className="day-grid-hour-label">{String(hour).padStart(2, '0')}:00</span>
                <div className="day-grid-hour-line" />
              </div>
            ))}

            {timedWorkouts.map((workout) => {
              const startMin = timeToMinutes(workout.start_time!.slice(0, 5))
              const endMin = workout.end_time
                ? timeToMinutes(workout.end_time.slice(0, 5))
                : startMin + 60
              const top = (startMin / 60) * HOUR_HEIGHT
              const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 28)
              return (
                <button
                  key={workout.id}
                  type="button"
                  className="day-grid-event"
                  style={{ top, height }}
                  onClick={() => onOpenClient(workout.client_id)}
                >
                  <span className="day-grid-event-time">{formatTimeRange(workout)}</span>
                  <span className="day-grid-event-name">{workout.client_name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {monthPickerOpen && (
        <MonthPickerSheet
          selectedDate={selectedDate}
          onPick={selectDateFromMonth}
          onClose={() => setMonthPickerOpen(false)}
        />
      )}
    </div>
  )
}
