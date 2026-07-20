import { useEffect, useState } from 'react'
import { getWorkout, deleteWorkout, type WorkoutWithExercises } from '../lib/workouts'
import { logEvent } from '../lib/analytics'

const statusLabel: Record<WorkoutWithExercises['status'], string> = {
  planned: 'Запланирована',
  done: 'Выполнена',
}

function formatDateRu(dateKey: string): string {
  const [year, month, day] = dateKey.split('-')
  return `${day}.${month}.${year}`
}

function formatTimeRange(workout: WorkoutWithExercises): string | null {
  if (!workout.start_time) return null
  const start = workout.start_time.slice(0, 5)
  if (!workout.end_time) return start
  return `${start}–${workout.end_time.slice(0, 5)}`
}

type Props = {
  workoutId: number
  onEdit: () => void
  onStart: () => void
  onDeleted: () => void
  onBack: () => void
  onOpenExerciseHistory: (exerciseId: number, exerciseName: string) => void
}

export function WorkoutViewPage({
  workoutId,
  onEdit,
  onStart,
  onDeleted,
  onBack,
  onOpenExerciseHistory,
}: Props) {
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    logEvent('workout_viewed', { workout_id: workoutId })
    getWorkout(workoutId)
      .then(setWorkout)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить тренировку'))
      .finally(() => setLoading(false))
  }, [workoutId])

  async function handleDelete() {
    if (!window.confirm('Вы уверены? Тренировка будет удалена безвозвратно.')) return
    setError(null)
    setDeleting(true)
    try {
      await deleteWorkout(workoutId)
      logEvent('workout_deleted', { workout_id: workoutId })
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить тренировку')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="clients-screen">
        <div className="clients-placeholder">Загрузка…</div>
      </div>
    )
  }

  if (error || !workout) {
    return (
      <div className="clients-screen">
        <header className="home-header">
          <button type="button" onClick={onBack}>
            Назад
          </button>
        </header>
        <p className="auth-error">{error ?? 'Тренировка не найдена'}</p>
      </div>
    )
  }

  const timeRange = formatTimeRange(workout)

  return (
    <div className="clients-screen">
      <header className="home-header">
        <button type="button" onClick={onBack}>
          Назад
        </button>
        <button type="button" className="icon-button" aria-label="Редактировать тренировку" onClick={onEdit}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      <div className="workout-view-summary">
        <div className="workout-view-datetime">
          {formatDateRu(workout.workout_date)}
          {timeRange && ` · ${timeRange}`}
        </div>
        <span
          className={
            workout.status === 'done' ? 'workout-status-dot done' : 'workout-status-dot missed'
          }
        />
        <span>{statusLabel[workout.status]}</span>
      </div>

      {workout.notes && <div className="workout-view-notes">{workout.notes}</div>}

      {workout.status === 'planned' && (
        <button type="button" className="live-workout-start-button" onClick={onStart}>
          ▶ Начать тренировку
        </button>
      )}

      <div className="workout-view-exercises">
        {workout.exercises.length === 0 && (
          <div className="clients-placeholder">Упражнений нет</div>
        )}

        {workout.exercises.map((exercise) => (
          <div key={exercise.id} className="workout-exercise-block">
            <button
              type="button"
              className="workout-exercise-name workout-exercise-name-button"
              onClick={() => onOpenExerciseHistory(exercise.exercise_id, exercise.exercise_name)}
            >
              {exercise.exercise_name}
            </button>

            {exercise.sets.length > 0 && (
              <div className="workout-view-sets-grid">
                <div className="workout-view-sets-capsule index">
                  <div className="workout-view-sets-capsule-header">
                    <span className="workout-set-group-label">Подход</span>
                    <div className="workout-set-pair">
                      <span className="workout-set-unit-label">&nbsp;</span>
                    </div>
                  </div>
                  {exercise.sets.map((set) => (
                    <span key={set.id} className="workout-set-index">
                      {set.position + 1}
                    </span>
                  ))}
                </div>

                <div className="workout-view-sets-capsule plan">
                  <div className="workout-view-sets-capsule-header">
                    <span className="workout-set-group-label">План</span>
                    <div className="workout-set-pair">
                      <span className="workout-set-unit-label">кг</span>
                      <span className="workout-set-unit-label">повт.</span>
                    </div>
                  </div>
                  {exercise.sets.map((set) => (
                    <div key={set.id} className="workout-set-pair">
                      <span>{set.plan_weight_kg ?? '—'}</span>
                      <span>{set.plan_reps ?? '—'}</span>
                    </div>
                  ))}
                </div>

                <div className="workout-view-sets-capsule fact">
                  <div className="workout-view-sets-capsule-header">
                    <span className="workout-set-group-label">Факт</span>
                    <div className="workout-set-pair">
                      <span className="workout-set-unit-label">кг</span>
                      <span className="workout-set-unit-label">повт.</span>
                    </div>
                  </div>
                  {exercise.sets.map((set) => (
                    <div key={set.id} className="workout-set-pair">
                      <span>{set.fact_weight_kg ?? '—'}</span>
                      <span>{set.fact_reps ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="workout-delete-button"
        disabled={deleting}
        onClick={handleDelete}
      >
        {deleting ? 'Удаление…' : 'Удалить тренировку'}
      </button>
    </div>
  )
}
