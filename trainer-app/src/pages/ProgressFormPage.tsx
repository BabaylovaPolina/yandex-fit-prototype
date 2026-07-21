import { useEffect, useState, type FormEvent } from 'react'
import {
  listCustomMetrics,
  addProgress,
  updateProgress,
  getProgressByDate,
  addCustomMetric,
  addCustomMetricValue,
  updateCustomMetricValue,
  type CustomMetric,
} from '../db/progress'
import { CustomMetricModal } from '../components/CustomMetricModal'
import { DatePicker } from '../components/DatePicker'
import { logEvent } from '../lib/analytics'

type Props = {
  clientId: number
  initialDate?: string
  onSaved: () => void
  onCancel: () => void
}

export function ProgressFormPage({ clientId, initialDate, onSaved, onCancel }: Props) {
  const [recordedDate, setRecordedDate] = useState(() => initialDate || new Date().toISOString().slice(0, 10))
  const [weight, setWeight] = useState('')
  const [chest, setChest] = useState('')
  const [waist, setWaist] = useState('')
  const [hip, setHip] = useState('')
  const [notes, setNotes] = useState('')

  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([])
  const [customValues, setCustomValues] = useState<Record<number, string>>({})
  const [modalOpen, setModalOpen] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(initialDate !== undefined)

  useEffect(() => {
    loadCustomMetrics()
    if (initialDate) {
      loadExistingProgress()
    }
  }, [clientId, initialDate])

  async function loadCustomMetrics() {
    try {
      const metrics = await listCustomMetrics(clientId)
      setCustomMetrics(metrics.filter((m) => m.is_active))
    } catch (err) {
      console.error('Error loading custom metrics:', err)
    }
  }

  async function loadExistingProgress() {
    try {
      const progress = await getProgressByDate(clientId, initialDate!)
      if (progress) {
        setWeight(progress.weight_kg?.toString() || '')
        setChest(progress.chest_cm?.toString() || '')
        setWaist(progress.waist_cm?.toString() || '')
        setHip(progress.hip_cm?.toString() || '')
        setNotes(progress.notes || '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке прогресса')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCustomMetric(name: string, unit?: string) {
    try {
      const metric = await addCustomMetric(clientId, name, unit)
      setCustomMetrics([...customMetrics, metric])
      setModalOpen(false)
    } catch (err) {
      throw err instanceof Error ? err : new Error('Ошибка при добавлении метрики')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const input = {
        client_id: clientId,
        recorded_date: recordedDate,
        weight_kg: weight ? parseFloat(weight) : null,
        chest_cm: chest ? parseInt(chest, 10) : null,
        waist_cm: waist ? parseInt(waist, 10) : null,
        hip_cm: hip ? parseInt(hip, 10) : null,
        notes: notes.trim() || null,
      }

      if (initialDate) {
        await updateProgress((await getProgressByDate(clientId, initialDate))!.id, input)
        logEvent('progress_updated', { client_id: clientId, date: recordedDate })
      } else {
        await addProgress(input)
        logEvent('progress_added', { client_id: clientId, date: recordedDate })
      }

      // Save custom metric values
      for (const metric of customMetrics) {
        const value = customValues[metric.id]
        if (value) {
          try {
            const existingValue = (
              await (window as any).__customMetricValue?.[metric.id]?.[recordedDate]
            )
            if (existingValue) {
              await updateCustomMetricValue(existingValue.id, parseFloat(value))
            } else {
              await addCustomMetricValue(metric.id, recordedDate, parseFloat(value))
            }
          } catch (err) {
            console.error(`Error saving custom metric ${metric.id}:`, err)
          }
        }
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении прогресса')
    } finally {
      setSaving(false)
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
        <span>{initialDate ? 'Редактировать прогресс' : 'Добавить прогресс'}</span>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Дата замера
          <DatePicker
            value={recordedDate}
            onChange={setRecordedDate}
            disabled={!!initialDate}
          />
        </label>

        <label>
          Вес
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="кг"
          />
        </label>

        <label>
          Грудь
          <input
            type="number"
            value={chest}
            onChange={(e) => setChest(e.target.value)}
            placeholder="см"
          />
        </label>

        <label>
          Талия
          <input
            type="number"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            placeholder="см"
          />
        </label>

        <label>
          Бёдра
          <input
            type="number"
            value={hip}
            onChange={(e) => setHip(e.target.value)}
            placeholder="см"
          />
        </label>

        {customMetrics.map((metric) => (
          <label key={metric.id}>
            {metric.metric_name}
            <input
              type="number"
              step="0.01"
              value={customValues[metric.id] || ''}
              onChange={(e) => setCustomValues({ ...customValues, [metric.id]: e.target.value })}
              placeholder={metric.metric_unit || ''}
            />
          </label>
        ))}

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setModalOpen(true)}
        >
          + Добавить параметр
        </button>

        <label>
          Заметки
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Отмена
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>

      {modalOpen && (
        <CustomMetricModal
          existingMetrics={customMetrics.map((m) => m.metric_name)}
          onAdd={handleAddCustomMetric}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
