import { useEffect, useState } from 'react'
import { listClients, type Client } from '../lib/clients'
import { listProgress, listCustomMetrics, type ProgressRecord, type CustomMetric } from '../lib/progress'
import { ProgressChart } from '../components/ProgressChart'
import { logEvent } from '../lib/analytics'

type MetricType =
  | 'weight'
  | 'chest'
  | 'waist'
  | 'hip'
  | { type: 'custom'; id: number; name: string; unit: string }

type Props = {
  onAddProgress: (clientId: number) => void
  refreshKey: number
}

export function AnalyticsPage({ onAddProgress, refreshKey }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [progress, setProgress] = useState<ProgressRecord[]>([])
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([])
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    loadClients()
  }, [refreshKey])

  useEffect(() => {
    if (selectedClient) {
      loadProgress()
      logEvent('analytics_opened', { client_id: selectedClient.id })
    }
  }, [selectedClient, refreshKey])

  async function loadClients() {
    try {
      setLoading(true)
      const data = await listClients()
      setClients(data)
      if (data.length > 0) {
        setSelectedClient(data[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке клиентов')
    } finally {
      setLoading(false)
    }
  }

  async function loadProgress() {
    if (!selectedClient) return

    try {
      setError(null)
      const [progressData, customData] = await Promise.all([
        listProgress(selectedClient.id),
        listCustomMetrics(selectedClient.id),
      ])
      setProgress(progressData)
      setCustomMetrics(customData.filter((m) => m.is_active))
      setSelectedMetric('weight')
    } catch (err) {
      console.error('Error loading progress:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке прогресса')
    }
  }

  if (loading) {
    return (
      <div className="clients-screen">
        <div className="clients-placeholder">Загрузка…</div>
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="clients-screen">
        <header className="home-header">
          <span>Аналитика</span>
        </header>
        <div className="clients-placeholder">Нет клиентов для отображения</div>
      </div>
    )
  }

  const metricButtons: MetricType[] = [
    'weight',
    'chest',
    'waist',
    'hip',
    ...customMetrics.map((m) => ({
      type: 'custom' as const,
      id: m.id,
      name: m.metric_name,
      unit: m.metric_unit || '',
    })),
  ]

  return (
    <div className="clients-screen">
      <header className="home-header">
        <span>Аналитика</span>
      </header>

      <div className="analytics-client-selector">
        <label>Выберите клиента:</label>
        <div className="dropdown-wrapper">
          <button
            type="button"
            className="dropdown-button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {selectedClient?.full_name}
            <span className="dropdown-arrow">▼</span>
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className={`dropdown-item ${selectedClient?.id === client.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedClient(client)
                    setDropdownOpen(false)
                  }}
                >
                  {client.full_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedClient && (
        <div className="analytics-section">
          <div className="progress-header">
            <h3>Прогресс: {selectedClient.full_name}</h3>
            <button
              type="button"
              className="btn-add-progress"
              onClick={() => onAddProgress(selectedClient.id)}
            >
              + Добавить измерение
            </button>
          </div>

          {progress.length === 0 ? (
            <div className="clients-placeholder">
              <p>Нет данных прогресса</p>
              <button
                type="button"
                className="btn-add-progress"
                onClick={() => onAddProgress(selectedClient.id)}
              >
                Добавить первое измерение
              </button>
            </div>
          ) : (
            <>
              <div className="progress-metric-tabs">
                {metricButtons.map((metric, index) => {
                  const isActive =
                    typeof metric === 'string'
                      ? metric === selectedMetric
                      : typeof selectedMetric === 'object' &&
                        selectedMetric.type === 'custom' &&
                        selectedMetric.id === metric.id

                  const label =
                    typeof metric === 'string'
                      ? {
                          weight: 'Вес',
                          chest: 'Грудь',
                          waist: 'Талия',
                          hip: 'Бёдра',
                        }[metric]
                      : metric.name

                  return (
                    <button
                      key={index}
                      type="button"
                      className={`metric-tab ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedMetric(metric)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <ProgressChart
                data={progress}
                metric={selectedMetric}
              />
            </>
          )}
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}
    </div>
  )
}
