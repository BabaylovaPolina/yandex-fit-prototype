import { useState } from 'react'
import { SUGGESTED_CUSTOM_METRICS } from '../lib/progress'

type Props = {
  existingMetrics: string[]
  onAdd: (name: string, unit?: string) => Promise<void>
  onClose: () => void
}

export function CustomMetricModal({ existingMetrics, onAdd, onClose }: Props) {
  const [tab, setTab] = useState<'suggested' | 'custom'>('suggested')
  const [customName, setCustomName] = useState('')
  const [customUnit, setCustomUnit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableSuggested = SUGGESTED_CUSTOM_METRICS.filter(
    (m) => !existingMetrics.includes(m.name),
  )

  const handleAddSuggested = async (name: string, unit: string) => {
    setLoading(true)
    setError(null)
    try {
      await onAdd(name, unit)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при добавлении метрики')
      setLoading(false)
    }
  }

  const handleAddCustom = async () => {
    if (!customName.trim()) {
      setError('Пожалуйста, введите название метрики')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onAdd(customName.trim(), customUnit.trim() || undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при добавлении метрики')
      setLoading(false)
    }
  }

  return (
    <div className="metric-modal-overlay">
      <div className="metric-modal">
        <div className="metric-modal-header">
          <h3>Добавить параметр для измерения</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="metric-modal-tabs">
          <button
            type="button"
            className={`metric-tab ${tab === 'suggested' ? 'active' : ''}`}
            onClick={() => setTab('suggested')}
          >
            Из списка
          </button>
          <button
            type="button"
            className={`metric-tab ${tab === 'custom' ? 'active' : ''}`}
            onClick={() => setTab('custom')}
          >
            Свой параметр
          </button>
        </div>

        <div className="metric-modal-content">
          {tab === 'suggested' ? (
            <div className="suggested-list">
              {availableSuggested.length === 0 ? (
                <p className="metric-empty">Все предложенные метрики уже добавлены</p>
              ) : (
                availableSuggested.map((metric) => (
                  <button
                    key={metric.name}
                    type="button"
                    className="metric-item"
                    onClick={() => handleAddSuggested(metric.name, metric.unit)}
                    disabled={loading}
                  >
                    <span className="metric-name">{metric.name}</span>
                    <span className="metric-unit">{metric.unit}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="custom-form">
              <label>
                <span className="label-text">Название параметра</span>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Например, мышечная масса"
                  disabled={loading}
                />
              </label>

              <label>
                <span className="label-text">Единица измерения (опционально)</span>
                <input
                  type="text"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="Например, кг или %"
                  disabled={loading}
                />
              </label>

              {error && <p className="metric-error">{error}</p>}

              <div className="custom-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={loading || !customName.trim()}
                >
                  {loading ? 'Добавление...' : 'Добавить'}
                </button>
              </div>
            </div>
          )}

          {tab === 'suggested' && error && <p className="metric-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
