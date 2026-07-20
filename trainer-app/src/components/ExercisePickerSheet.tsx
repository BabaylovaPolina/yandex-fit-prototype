import { useEffect, useMemo, useState } from 'react'
import {
  createExercise,
  listExercises,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  INPUT_KIND_LABELS,
  type Exercise,
  type MuscleGroup,
  type InputKind,
} from '../api/exercises'

type Category = 'all' | MuscleGroup

type Props = {
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePickerSheet({ onPick, onClose }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState<MuscleGroup | null>(null)
  const [newInputKind, setNewInputKind] = useState<InputKind>('distance')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listExercises()
      .then(setExercises)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить упражнения'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return exercises.filter((ex) => {
      const matchesCategory = category === 'all' || ex.muscle_group === category
      const matchesSearch = query === '' || ex.name.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [exercises, category, search])

  async function handleCreate() {
    if (newName.trim() === '' || newGroup === null) return
    setSaving(true)
    setError(null)
    try {
      const exercise = await createExercise(newName, newGroup, newGroup === 'cardio' ? newInputKind : null)
      onPick(exercise)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать упражнение')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet exercise-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {creating ? (
          <>
            <div className="sheet-header">
              <span className="sheet-title">Своё упражнение</span>
              <button type="button" className="picker-close" onClick={() => setCreating(false)}>
                ✕
              </button>
            </div>

            <label>
              Название
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: Болгарский присед"
              />
            </label>

            <div className="picker-cats">
              {MUSCLE_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  className={group === newGroup ? 'picker-cat active' : 'picker-cat'}
                  onClick={() => setNewGroup(group)}
                >
                  {MUSCLE_GROUP_LABELS[group]}
                </button>
              ))}
            </div>

            {newGroup === 'cardio' && (
              <div className="picker-cats">
                {(Object.keys(INPUT_KIND_LABELS) as (keyof typeof INPUT_KIND_LABELS)[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={kind === newInputKind ? 'picker-cat active' : 'picker-cat'}
                    onClick={() => setNewInputKind(kind)}
                  >
                    {INPUT_KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button
              type="button"
              className="picker-create-save"
              disabled={saving || newName.trim() === '' || newGroup === null}
              onClick={handleCreate}
            >
              {saving ? 'Сохранение…' : 'Сохранить упражнение'}
            </button>
          </>
        ) : (
          <>
            <div className="sheet-header">
              <span className="sheet-title">Добавить упражнение</span>
              <button type="button" className="picker-close" onClick={onClose}>
                ✕
              </button>
            </div>

            <input
              type="text"
              className="picker-search-input"
              placeholder="Найти упражнение..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="picker-cats">
              <button
                type="button"
                className={category === 'all' ? 'picker-cat active' : 'picker-cat'}
                onClick={() => setCategory('all')}
              >
                Все
              </button>
              {MUSCLE_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  className={category === group ? 'picker-cat active' : 'picker-cat'}
                  onClick={() => setCategory(group)}
                >
                  {MUSCLE_GROUP_LABELS[group]}
                </button>
              ))}
            </div>

            <button type="button" className="picker-create-btn" onClick={() => setCreating(true)}>
              ＋ Создать своё упражнение
            </button>

            {loading && <div className="clients-placeholder">Загрузка…</div>}
            {error && <p className="auth-error">{error}</p>}

            {!loading && !error && (
              <ul className="picker-list">
                {filtered.length === 0 && (
                  <li className="clients-placeholder">Ничего не найдено</li>
                )}
                {filtered.map((exercise) => (
                  <li key={exercise.id}>
                    <button type="button" className="picker-list-item" onClick={() => onPick(exercise)}>
                      <span>{exercise.name}</span>
                      <span className="picker-list-item-cat">
                        {MUSCLE_GROUP_LABELS[exercise.muscle_group]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
