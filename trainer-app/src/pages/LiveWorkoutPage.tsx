import { useEffect, useMemo, useState } from 'react'
import {
  getWorkout,
  updateSetFact,
  updateWorkoutStatus,
  addExerciseToWorkout,
  addSetToExercise,
  type WorkoutWithExercises,
  type WorkoutExercise,
} from '../lib/workouts'
import { logEvent } from '../lib/analytics'
import { playGong } from '../lib/gong'
import { ExercisePickerSheet } from './ExercisePickerSheet'
import type { Exercise } from '../lib/exercises'

const REST_SECONDS = 90

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

type Props = {
  workoutId: number
  onFinished: () => void
  onCancel: () => void
}

export function LiveWorkoutPage({ workoutId, onFinished, onCancel }: Props) {
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restRemaining, setRestRemaining] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    logEvent('live_workout_started', { workout_id: workoutId })
    getWorkout(workoutId)
      .then(setWorkout)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить тренировку'))
      .finally(() => setLoading(false))
  }, [workoutId])

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (restRemaining === null) return
    if (restRemaining <= 0) {
      playGong()
      setRestRemaining(null)
      return
    }
    const timer = setTimeout(() => setRestRemaining((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(timer)
  }, [restRemaining])

  const exercise = workout?.exercises[exerciseIndex] ?? null
  const isLastExercise = workout ? exerciseIndex === workout.exercises.length - 1 : false

  function updateExerciseInState(updated: WorkoutExercise) {
    setWorkout((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((ex) => (ex.id === updated.id ? updated : ex)),
          }
        : prev,
    )
  }

  async function handleFactChange(setId: number, patch: { fact_weight_kg?: number | null; fact_reps?: number | null }) {
    if (!exercise) return
    const set = exercise.sets.find((s) => s.id === setId)
    if (!set) return

    const nextFact = {
      fact_weight_kg: patch.fact_weight_kg ?? set.fact_weight_kg,
      fact_reps: patch.fact_reps ?? set.fact_reps,
    }

    updateExerciseInState({
      ...exercise,
      sets: exercise.sets.map((s) => (s.id === setId ? { ...s, ...nextFact } : s)),
    })

    try {
      await updateSetFact(setId, nextFact)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить подход')
    }
  }

  function handleSetAsPlan(setId: number) {
    const set = exercise?.sets.find((s) => s.id === setId)
    if (!set) return
    handleFactChange(setId, { fact_weight_kg: set.plan_weight_kg, fact_reps: set.plan_reps })
    setRestRemaining(REST_SECONDS)
  }

  function handleStep(setId: number, field: 'fact_weight_kg' | 'fact_reps', delta: number) {
    const set = exercise?.sets.find((s) => s.id === setId)
    if (!set) return
    const current = set[field] ?? 0
    const next = Math.max(0, current + delta)
    handleFactChange(setId, { [field]: next })
  }

  function handleSetDone() {
    setRestRemaining(REST_SECONDS)
  }

  async function handleAddSet() {
    if (!exercise) return
    try {
      const newSet = await addSetToExercise(exercise.id)
      updateExerciseInState({ ...exercise, sets: [...exercise.sets, newSet] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить подход')
    }
  }

  async function handlePickExercise(pickedExercise: Exercise) {
    setPickerOpen(false)
    try {
      const newExercise = await addExerciseToWorkout(workoutId, pickedExercise.name)
      setWorkout((prev) => (prev ? { ...prev, exercises: [...prev.exercises, newExercise] } : prev))
      setExerciseIndex((i) => (workout ? workout.exercises.length : i))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить упражнение')
    }
  }

  function goNext() {
    setRestRemaining(null)
    setExerciseIndex((i) => i + 1)
  }

  async function handleFinish() {
    setFinishing(true)
    try {
      await updateWorkoutStatus(workoutId, 'done')
      logEvent('live_workout_finished', { workout_id: workoutId, duration_seconds: elapsedSeconds })
      onFinished()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось завершить тренировку')
      setFinishing(false)
    }
  }

  const showSummary = workout !== null && exerciseIndex >= workout.exercises.length

  const totalSets = useMemo(
    () => workout?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) ?? 0,
    [workout],
  )

  if (loading) {
    return (
      <div className="clients-screen">
        <div className="clients-placeholder">Загрузка…</div>
      </div>
    )
  }

  if (error && !workout) {
    return (
      <div className="clients-screen">
        <p className="auth-error">{error}</p>
        <button type="button" onClick={onCancel}>
          Назад
        </button>
      </div>
    )
  }

  if (!workout) return null

  return (
    <div className="clients-screen live-workout-screen">
      <header className="home-header">
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
        <span className="live-workout-timer">{formatDuration(elapsedSeconds)}</span>
      </header>

      {error && <p className="auth-error">{error}</p>}

      {showSummary ? (
        <div className="live-workout-summary">
          <div className="live-workout-summary-title">Тренировка завершена</div>
          <div className="live-workout-summary-time">{formatDuration(elapsedSeconds)}</div>
          <div className="live-workout-summary-meta">
            Упражнений: {workout.exercises.length} · Подходов: {totalSets}
          </div>
          <button type="button" disabled={finishing} onClick={handleFinish}>
            {finishing ? 'Сохранение…' : 'Завершить тренировку'}
          </button>
        </div>
      ) : exercise ? (
        <div className="live-workout-body">
          <div className="live-workout-progress">
            Упражнение {exerciseIndex + 1} из {workout.exercises.length}
          </div>
          <div className="live-workout-exercise-name">{exercise.exercise_name}</div>

          {restRemaining !== null && (
            <div className="live-workout-rest">
              <span>Отдых: {formatDuration(restRemaining)}</span>
              <button type="button" className="live-workout-rest-skip" onClick={() => setRestRemaining(null)}>
                Пропустить
              </button>
            </div>
          )}

          <div className="live-workout-sets">
            {exercise.sets.map((set, index) => (
              <div key={set.id} className="live-workout-set-card">
                <div className="live-workout-set-header">
                  <span>Подход {index + 1}</span>
                  <span className="live-workout-set-plan">
                    План: {set.plan_weight_kg ?? '—'} кг × {set.plan_reps ?? '—'}
                  </span>
                </div>

                <div className="live-workout-steppers">
                  <div className="live-workout-stepper">
                    <span className="live-workout-stepper-label">кг</span>
                    <div className="live-workout-stepper-controls">
                      <button type="button" onClick={() => handleStep(set.id, 'fact_weight_kg', -2.5)}>
                        −
                      </button>
                      <span className="live-workout-stepper-value">{set.fact_weight_kg ?? '—'}</span>
                      <button type="button" onClick={() => handleStep(set.id, 'fact_weight_kg', 2.5)}>
                        +
                      </button>
                    </div>
                  </div>

                  <div className="live-workout-stepper">
                    <span className="live-workout-stepper-label">повт.</span>
                    <div className="live-workout-stepper-controls">
                      <button type="button" onClick={() => handleStep(set.id, 'fact_reps', -1)}>
                        −
                      </button>
                      <span className="live-workout-stepper-value">{set.fact_reps ?? '—'}</span>
                      <button type="button" onClick={() => handleStep(set.id, 'fact_reps', 1)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="live-workout-set-actions">
                  <button type="button" className="live-workout-as-plan" onClick={() => handleSetAsPlan(set.id)}>
                    ✓ Как план
                  </button>
                  <button type="button" className="live-workout-set-done" onClick={handleSetDone}>
                    Готово, отдых
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="live-workout-add-set" onClick={handleAddSet}>
            + Подход
          </button>

          <button type="button" className="live-workout-next" onClick={goNext}>
            {isLastExercise ? 'Завершить упражнения' : 'Следующее упражнение'}
          </button>
        </div>
      ) : (
        <div className="live-workout-body">
          <div className="clients-placeholder">В плане нет упражнений</div>
          <button type="button" onClick={() => setPickerOpen(true)}>
            + Добавить упражнение
          </button>
          <button type="button" className="live-workout-next" onClick={goNext}>
            Завершить упражнения
          </button>
        </div>
      )}

      {!showSummary && (
        <button type="button" className="live-workout-add-exercise" onClick={() => setPickerOpen(true)}>
          + Ещё упражнение
        </button>
      )}

      {pickerOpen && (
        <ExercisePickerSheet onPick={handlePickExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}
