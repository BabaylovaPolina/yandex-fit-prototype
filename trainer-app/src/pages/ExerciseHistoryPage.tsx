import { useEffect, useState } from 'react'
import { getExerciseHistory, type ExerciseHistoryEntry, type WorkoutSet } from '../api/workouts'
import { logEvent } from '../lib/analytics'
import type { InputKind } from '../api/exercises'

function formatDateRu(dateKey: string): string {
  const [year, month, day] = dateKey.split('-')
  return `${day}.${month}.${year.slice(2)}`
}

function chartValue(inputKind: InputKind, set: WorkoutSet): number | null {
  if (inputKind === null) return set.fact_weight_kg
  if (inputKind === 'distance') return set.fact_distance_km
  return set.fact_reps
}

function chartUnit(inputKind: InputKind): string {
  if (inputKind === null) return 'кг'
  if (inputKind === 'distance') return 'км'
  return 'прыжков'
}

function maxChartValue(inputKind: InputKind, entry: ExerciseHistoryEntry): number | null {
  const values = entry.sets.map((s) => chartValue(inputKind, s)).filter((v): v is number => v !== null)
  return values.length === 0 ? null : Math.max(...values)
}

function buildChartPoints(inputKind: InputKind, entries: ExerciseHistoryEntry[]) {
  return entries
    .map((entry) => ({ date: entry.workout_date, value: maxChartValue(inputKind, entry) }))
    .filter((point): point is { date: string; value: number } => point.value !== null)
}

function ExerciseChart({ points, unit }: { points: { date: string; value: number }[]; unit: string }) {
  const width = 320
  const height = 140
  const padding = 24

  const values = points.map((p) => p.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue || 1

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((point.value - minValue) / range) * (height - padding * 2)
    return { x, y, point }
  })

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')

  return (
    <svg width={width} height={height} className="exercise-chart">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      {coords.map((c) => (
        <circle key={c.point.date} cx={c.x} cy={c.y} r="4" fill="var(--accent)" />
      ))}
      {coords.map((c) => (
        <text key={`${c.point.date}-label`} x={c.x} y={c.y - 10} textAnchor="middle" className="exercise-chart-label">
          {c.point.value} {unit}
        </text>
      ))}
    </svg>
  )
}

type Props = {
  clientId: number
  exerciseId: number
  exerciseName: string
  inputKind: InputKind
  onBack: () => void
}

export function ExerciseHistoryPage({ clientId, exerciseId, exerciseName, inputKind, onBack }: Props) {
  const [entries, setEntries] = useState<ExerciseHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    logEvent('exercise_history_viewed', { exercise_id: exerciseId })
    getExerciseHistory(clientId, exerciseId)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить историю'))
      .finally(() => setLoading(false))
  }, [clientId, exerciseId])

  const chartPoints = buildChartPoints(inputKind, entries)
  const unit = chartUnit(inputKind)

  return (
    <div className="clients-screen">
      <header className="home-header">
        <button type="button" onClick={onBack}>
          Назад
        </button>
        <span>{exerciseName}</span>
      </header>

      {loading && <div className="clients-placeholder">Загрузка…</div>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <div className="clients-placeholder">Пока нет завершённых тренировок с этим упражнением</div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          {chartPoints.length > 1 && (
            <div className="exercise-chart-wrap">
              <ExerciseChart points={chartPoints} unit={unit} />
            </div>
          )}

          <ul className="exercise-history-list">
            {[...entries].reverse().map((entry) => (
              <li key={entry.workout_id} className="exercise-history-item">
                <div className="exercise-history-date">{formatDateRu(entry.workout_date)}</div>
                <div className="exercise-history-sets">
                  {entry.sets.map((set, index) => (
                    <span key={set.id} className="exercise-history-set">
                      {index + 1}:{' '}
                      {inputKind === null && `${set.fact_weight_kg ?? '—'} кг × ${set.fact_reps ?? '—'}`}
                      {inputKind === 'distance' &&
                        `${set.fact_duration_min ?? '—'} мин × ${set.fact_distance_km ?? '—'} км`}
                      {inputKind === 'reps' &&
                        `${set.fact_duration_min ?? '—'} мин × ${set.fact_reps ?? '—'} прыжков`}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
