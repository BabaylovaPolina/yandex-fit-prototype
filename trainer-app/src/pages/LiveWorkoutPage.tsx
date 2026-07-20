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
import type { Exercise, InputKind } from '../lib/exercises'

const REST_SECONDS = 90

type FactField = 'fact_weight_kg' | 'fact_reps' | 'fact_duration_min' | 'fact_distance_km'
type PlanField = 'plan_weight_kg' | 'plan_reps' | 'plan_duration_min' | 'plan_distance_km'

function stepperFields(inputKind: InputKind): {
  first: { label: string; plan: PlanField; fact: FactField; step: number }
  second: { label: string; plan: PlanField; fact: FactField; step: number }
} {
  if (inputKind === 'distance') {
    return {
      first: { label: 'мин', plan: 'plan_duration_min', fact: 'fact_duration_min', step: 1 },
      second: { label: 'км', plan: 'plan_distance_km', fact: 'fact_distance_km', step: 0.5 },
    }
  }
  if (inputKind === 'reps') {
    return {
      first: { label: 'мин', plan: 'plan_duration_min', fact: 'fact_duration_min', step: 1 },
      second: { label: 'прыжков', plan: 'plan_reps', fact: 'fact_reps', step: 10 },
    }
  }
  return {
    first: { label: 'кг', plan: 'plan_weight_kg', fact: 'fact_weight_kg', step: 2.5 },
    second: { label: 'повт.', plan: 'plan_reps', fact: 'fact_reps', step: 1 },
  }
}

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
  const [confirmedSetIds, setConfirmedSetIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    logEvent('live_workout_started', { workout_id: workoutId })
    getWorkout(workoutId)
      .then((data) => {
        const prefilled: WorkoutWithExercises = {
          ...data,
          exercises: data.exercises.map((ex) => {
            const { first, second } = stepperFields(ex.input_kind)
            return {
              ...ex,
              sets: ex.sets.map((set) => {
                const needsFirst = set[first.fact] === null && set[first.plan] !== null
                const needsSecond = set[second.fact] === null && set[second.plan] !== null
                if (!needsFirst && !needsSecond) return set

                const patch: Partial<Record<FactField, number | null>> = {}
                if (needsFirst) patch[first.fact] = set[first.plan]
                if (needsSecond) patch[second.fact] = set[second.plan]
                updateSetFact(set.id, patch).catch(() => {})
                return { ...set, ...patch }
              }),
            }
          }),
        }
        setWorkout(prefilled)
      })
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

  async function handleFactChange(setId: number, patch: Partial<Record<FactField, number | null>>) {
    if (!exercise) return
    const set = exercise.sets.find((s) => s.id === setId)
    if (!set) return

    const nextFact = { ...patch }

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

  function handleStep(setId: number, field: FactField, delta: number) {
    const set = exercise?.sets.find((s) => s.id === setId)
    if (!set) return
    const current = set[field] ?? 0
    const next = Math.max(0, current + delta)
    handleFactChange(setId, { [field]: next })
  }

  function handleConfirmSet(setId: number) {
    setConfirmedSetIds((prev) => new Set(prev).add(setId))
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
            {(() => {
              const activeSetId = exercise.sets.find((s) => !confirmedSetIds.has(s.id))?.id
              return exercise.sets.map((set, index) => {
                const { first, second } = stepperFields(exercise.input_kind)
                const isActive = set.id === activeSetId
                const isConfirmed = confirmedSetIds.has(set.id)
                return (
                  <div
                    key={set.id}
                    className={
                      isActive
                        ? 'live-workout-set-card active'
                        : isConfirmed
                          ? 'live-workout-set-card confirmed'
                          : 'live-workout-set-card'
                    }
                  >
                    <div className="live-workout-set-header">
                      <span>Подход {index + 1}</span>
                      <span className="live-workout-set-plan">
                        План: {set[first.plan] ?? '—'} {first.label} × {set[second.plan] ?? '—'}{' '}
                        {second.label}
                      </span>
                    </div>

                    <div className="live-workout-steppers">
                      <div className="live-workout-stepper">
                        <span className="live-workout-stepper-label">{first.label}</span>
                        <div className="live-workout-stepper-controls">
                          <button type="button" onClick={() => handleStep(set.id, first.fact, -first.step)}>
                            −
                          </button>
                          <span className="live-workout-stepper-value">{set[first.fact] ?? '—'}</span>
                          <button type="button" onClick={() => handleStep(set.id, first.fact, first.step)}>
                            +
                          </button>
                        </div>
                      </div>

                      <div className="live-workout-stepper">
                        <span className="live-workout-stepper-label">{second.label}</span>
                        <div className="live-workout-stepper-controls">
                          <button type="button" onClick={() => handleStep(set.id, second.fact, -second.step)}>
                            −
                          </button>
                          <span className="live-workout-stepper-value">{set[second.fact] ?? '—'}</span>
                          <button type="button" onClick={() => handleStep(set.id, second.fact, second.step)}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <button
                        type="button"
                        className="live-workout-set-done"
                        onClick={() => handleConfirmSet(set.id)}
                      >
                        Готово, отдых
                      </button>
                    )}
                  </div>
                )
              })
            })()}
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
