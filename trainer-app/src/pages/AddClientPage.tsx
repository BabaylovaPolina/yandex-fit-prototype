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
    <div className="auth-screen">
      <header className="home-header">
        <span>Новый клиент</span>
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          ФИО
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>

        <label>
          Пол
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
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

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
