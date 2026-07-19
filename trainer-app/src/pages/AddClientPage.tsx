import { useState, type FormEvent } from 'react'
import { createClientRecord, type Gender } from '../lib/clients'
import { logEvent } from '../lib/analytics'

type Props = {
  onSaved: () => void
  onCancel: () => void
}

export function AddClientPage({ onSaved, onCancel }: Props) {
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [age, setAge] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [goal, setGoal] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await createClientRecord({
        full_name: fullName.trim(),
        gender,
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        goal: goal.trim() || null,
        note: note.trim() || null,
      })
      logEvent('client_added')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить клиента')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-screen">
      <header className="home-header">
        <span>Новый клиент</span>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Имя
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>

        <label>
          Пол
          <div className="gender-choice">
            <button
              type="button"
              className={gender === 'male' ? 'gender-option selected' : 'gender-option'}
              onClick={() => setGender('male')}
            >
              Мужской
            </button>
            <button
              type="button"
              className={gender === 'female' ? 'gender-option selected' : 'gender-option'}
              onClick={() => setGender('female')}
            >
              Женский
            </button>
          </div>
        </label>

        <label>
          Возраст
          <input
            type="number"
            required
            min={1}
            max={119}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </label>

        <div className="form-row">
          <label>
            Рост, см
            <input
              type="number"
              required
              min={1}
              max={259}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </label>

          <label>
            Вес, кг
            <input
              type="number"
              required
              min={1}
              max={399}
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </label>
        </div>

        <label>
          Цель
          <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>

        <label>
          Заметка
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

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
    </div>
  )
}
