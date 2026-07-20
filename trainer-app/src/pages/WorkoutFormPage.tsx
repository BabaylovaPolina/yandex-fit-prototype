import { useEffect, useState, type FormEvent } from 'react'
import {
  createWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkout,
  type WorkoutStatus,
  type SetInput,
} from '../lib/workouts'
import { logEvent } from '../lib/analytics'
import { ExercisePickerSheet } from './ExercisePickerSheet'
import type { Exercise } from '../lib/exercises'

type SetDraft = SetInput & { key: string }
type ExerciseDraft = {
  key: string
  exerciseName: string
  sets: SetDraft[]
}

let draftKeyCounter = 0
function nextKey() {
  draftKeyCounter += 1
  return `draft-${draftKeyCounter}`
}

function emptySet(): SetDraft {
  return {
    key: nextKey(),
    plan_weight_kg: null,
    plan_reps: null,
    fact_weight_kg: null,
    fact_reps: null,
  }
}

function emptyExercise(name: string): ExerciseDraft {
  return { key: nextKey(), exerciseName: name, sets: [emptySet()] }
}

type Props = {
  clientId: number
  workoutId?: number
  initialDate?: string
  onSaved: () => void
  onCancel: () => void
}

export function WorkoutFormPage({ clientId, workoutId, initialDate, onSaved, onCancel }: Props) {
  const [workoutDate, setWorkoutDate] = useState(
    () => initialDate ?? new Date().toISOString().slice(0, 10),
  )
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState<WorkoutStatus>('planned')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(workoutId !== undefined)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (workoutId === undefined) return
    getWorkout(workoutId)
      .then((workout) => {
        setWorkoutDate(workout.workout_date)
        setStartTime(workout.start_time?.slice(0, 5) ?? '')
        setEndTime(workout.end_time?.slice(0, 5) ?? '')
        setStatus(workout.status)
        setNotes(workout.notes ?? '')
        setExercises(
          workout.exercises.map((ex) => ({
            key: nextKey(),
            exerciseName: ex.exercise_name,
            sets:
              ex.sets.length === 0
                ? [emptySet()]
                : ex.sets.map((s) => ({
                    key: nextKey(),
                    plan_weight_kg: s.plan_weight_kg,
                    plan_reps: s.plan_reps,
                    fact_weight_kg: s.fact_weight_kg,
                    fact_reps: s.fact_reps,
                  })),
          })),
        )
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить тренировку'))
      .finally(() => setLoading(false))
  }, [workoutId])

  function updateSet(exerciseKey: string, setKey: string, patch: Partial<SetDraft>) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.key !== exerciseKey
          ? ex
          : { ...ex, sets: ex.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) },
      ),
    )
  }

  function handlePickExercise(exercise: Exercise) {
    setExercises((prev) => [...prev, emptyExercise(exercise.name)])
    setPickerOpen(false)
  }

  function removeExercise(key: string) {
    setExercises((prev) => prev.filter((ex) => ex.key !== key))
  }

  function addSet(exerciseKey: string) {
    setExercises((prev) =>
      prev.map((ex) => (ex.key === exerciseKey ? { ...ex, sets: [...ex.sets, emptySet()] } : ex)),
    )
  }

  function removeSet(exerciseKey: string, setKey: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.key !== exerciseKey ? ex : { ...ex, sets: ex.sets.filter((s) => s.key !== setKey) },
      ),
    )
  }

  function numberOrNull(value: string): number | null {
    if (value.trim() === '') return null
    const n = Number(value)
    return Number.isNaN(n) ? null : n
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const input = {
        client_id: clientId,
        workout_date: workoutDate,
        start_time: startTime || null,
        end_time: endTime || null,
        status,
        notes: notes.trim() || null,
        exercises: exercises
          .filter((ex) => ex.exerciseName.trim() !== '')
          .map((ex) => ({
            exercise_name: ex.exerciseName.trim(),
            sets: ex.sets.map(({ key: _key, ...set }) => set),
          })),
      }

      if (workoutId === undefined) {
        await createWorkout(input)
        logEvent('workout_added')
      } else {
        await updateWorkout(workoutId, input)
        logEvent('workout_updated')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить тренировку')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (workoutId === undefined) return
    if (!window.confirm('Вы уверены? Тренировка будет удалена безвозвратно.')) return

    setError(null)
    setDeleting(true)
    try {
      await deleteWorkout(workoutId)
      logEvent('workout_deleted', { workout_id: workoutId })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить тренировку')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="form-screen">
        <div className="clients-placeholder">Загрузка…</div>
      </div>
    )
  }

  return (
    <div className="form-screen">
      <header className="home-header">
        <span>{workoutId === undefined ? 'Новая тренировка' : 'Тренировка'}</span>
        {workoutId !== undefined && (
          <button
            type="button"
            className="workout-delete-button"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Удаление…' : 'Удалить'}
          </button>
        )}
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Дата
          <input
            type="date"
            required
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
          />
        </label>

        <div className="form-row">
          <label>
            Начало
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label>
            Конец
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label>
          Статус
          <div className="gender-choice">
            <button
              type="button"
              className={status === 'planned' ? 'gender-option selected' : 'gender-option'}
              onClick={() => setStatus('planned')}
            >
              Запланирована
            </button>
            <button
              type="button"
              className={status === 'done' ? 'gender-option selected' : 'gender-option'}
              onClick={() => setStatus('done')}
            >
              Выполнена
            </button>
          </div>
        </label>

        <label>
          Заметки
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="workout-exercises">
          {exercises.map((exercise) => (
            <div key={exercise.key} className="workout-exercise-block">
              <div className="workout-exercise-header">
                <span className="workout-exercise-name">{exercise.exerciseName}</span>
                <button type="button" onClick={() => removeExercise(exercise.key)}>
                  Удалить
                </button>
              </div>

              {exercise.sets.length > 0 && (
                <div className="workout-set-row workout-set-row-labels">
                  <span />
                  <span className="workout-set-group-label">План</span>
                  <span className="workout-set-group-label">Факт</span>
                  <span />
                </div>
              )}
              {exercise.sets.map((set, index) => (
                <div key={set.key} className="workout-set-row">
                  <span className="workout-set-index">#{index + 1}</span>
                  <div className="workout-set-pair">
                    <input
                      type="number"
                      placeholder="кг"
                      value={set.plan_weight_kg ?? ''}
                      onChange={(e) =>
                        updateSet(exercise.key, set.key, {
                          plan_weight_kg: numberOrNull(e.target.value),
                        })
                      }
                    />
                    <input
                      type="number"
                      placeholder="повт."
                      value={set.plan_reps ?? ''}
                      onChange={(e) =>
                        updateSet(exercise.key, set.key, { plan_reps: numberOrNull(e.target.value) })
                      }
                    />
                  </div>
                  <div className="workout-set-pair">
                    <input
                      type="number"
                      placeholder="кг"
                      value={set.fact_weight_kg ?? ''}
                      onChange={(e) =>
                        updateSet(exercise.key, set.key, {
                          fact_weight_kg: numberOrNull(e.target.value),
                        })
                      }
                    />
                    <input
                      type="number"
                      placeholder="повт."
                      value={set.fact_reps ?? ''}
                      onChange={(e) =>
                        updateSet(exercise.key, set.key, { fact_reps: numberOrNull(e.target.value) })
                      }
                    />
                  </div>
                  <button type="button" onClick={() => removeSet(exercise.key, set.key)}>
                    ×
                  </button>
                </div>
              ))}

              <button type="button" onClick={() => addSet(exercise.key)}>
                + Подход
              </button>
            </div>
          ))}

          <button type="button" onClick={() => setPickerOpen(true)}>
            + Упражнение
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>

      {pickerOpen && (
        <ExercisePickerSheet onPick={handlePickExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}
