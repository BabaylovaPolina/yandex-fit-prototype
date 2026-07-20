import { useEffect, useState } from 'react'
import { getExerciseHistory, type ExerciseHistoryEntry } from '../lib/workouts'
import { logEvent } from '../lib/analytics'

function formatDateRu(dateKey: string): string {
  const [year, month, day] = dateKey.split('-')
  return `${day}.${month}.${year.slice(2)}`
}

function maxFactWeight(entry: ExerciseHistoryEntry): number | null {
  const weights = entry.sets.map((s) => s.fact_weight_kg).filter((w): w is number => w !== null)
  return weights.length === 0 ? null : Math.max(...weights)
}

function buildChartPoints(entries: ExerciseHistoryEntry[]) {
  return entries
    .map((entry) => ({ date: entry.workout_date, weight: maxFactWeight(entry) }))
    .filter((point): point is { date: string; weight: number } => point.weight !== null)
}

function ExerciseChart({ points }: { points: { date: string; weight: number }[] }) {
  const width = 320
  const height = 140
  const padding = 24

  const weights = points.map((p) => p.weight)
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const range = maxWeight - minWeight || 1

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((point.weight - minWeight) / range) * (height - padding * 2)
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
          {c.point.weight}
        </text>
      ))}
    </svg>
  )
}

type Props = {
  clientId: number
  exerciseId: number
  exerciseName: string
  onBack: () => void
}

export function ExerciseHistoryPage({ clientId, exerciseId, exerciseName, onBack }: Props) {
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

  const chartPoints = buildChartPoints(entries)

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
              <ExerciseChart points={chartPoints} />
            </div>
          )}

          <ul className="exercise-history-list">
            {[...entries].reverse().map((entry) => (
              <li key={entry.workout_id} className="exercise-history-item">
                <div className="exercise-history-date">{formatDateRu(entry.workout_date)}</div>
                <div className="exercise-history-sets">
                  {entry.sets.map((set, index) => (
                    <span key={set.id} className="exercise-history-set">
                      {index + 1}: {set.fact_weight_kg ?? '—'} кг × {set.fact_reps ?? '—'}
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
