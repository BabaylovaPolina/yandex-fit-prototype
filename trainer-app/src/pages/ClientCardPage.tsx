import { useState, type FormEvent } from 'react'
import { updateClientRecord, type Client, type Gender } from '../api/clients'
import { logEvent } from '../lib/analytics'

type Props = {
  client: Client
  onSaved: () => void
  onCancel: () => void
}

export function ClientCardPage({ client, onSaved, onCancel }: Props) {
  const [fullName, setFullName] = useState(client.full_name)
  const [gender, setGender] = useState<Gender>(client.gender)
  const [age, setAge] = useState(String(client.age))
  const [heightCm, setHeightCm] = useState(String(client.height_cm))
  const [weightKg, setWeightKg] = useState(String(client.weight_kg))
  const [goal, setGoal] = useState(client.goal ?? '')
  const [note, setNote] = useState(client.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateClientRecord(client.id, {
        full_name: fullName.trim(),
        gender,
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        goal: goal.trim() || null,
        note: note.trim() || null,
      })
      logEvent('client_updated')
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
        <span>Карточка клиента</span>
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

        <label>
          Цель
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} />
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
