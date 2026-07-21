import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { ProgressRecord } from '../db/progress'
import type { CustomMetricValue } from '../db/progress'

type MetricType =
  | 'weight'
  | 'chest'
  | 'waist'
  | 'hip'
  | { type: 'custom'; id: number; name: string; unit: string }

type Props = {
  data: ProgressRecord[]
  customData?: CustomMetricValue[]
  metric: MetricType
}

const METRIC_LABELS: Record<string, { label: string; unit: string; key: keyof ProgressRecord }> = {
  weight: { label: 'Вес', unit: 'кг', key: 'weight_kg' },
  chest: { label: 'Грудь', unit: 'см', key: 'chest_cm' },
  waist: { label: 'Талия', unit: 'см', key: 'waist_cm' },
  hip: { label: 'Бёдра', unit: 'см', key: 'hip_cm' },
}

export function ProgressChart({ data, customData, metric }: Props) {
  const isCustom = typeof metric === 'object'
  const metricKey = isCustom ? undefined : METRIC_LABELS[metric].key

  // Prepare data for chart
  const chartData = isCustom
    ? customData?.map((item) => ({
        date: item.recorded_date,
        value: item.value,
      })) || []
    : data
        .map((item) => ({
          date: item.recorded_date,
          value: metricKey ? item[metricKey] : null,
        }))
        .filter((item) => item.value !== null)

  if (chartData.length === 0) {
    return (
      <div className="progress-chart-empty">
        <p>Нет данных для отображения</p>
      </div>
    )
  }

  const getMetricLabel = (): { label: string; unit: string } => {
    if (isCustom) {
      return { label: metric.name, unit: metric.unit || '' }
    }
    const m = METRIC_LABELS[metric]
    return { label: m.label, unit: m.unit }
  }

  const { label, unit } = getMetricLabel()

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ value: number; payload: { date: string } }>
  }) => {
    if (active && payload && payload.length > 0) {
      const value = payload[0].value
      const date = payload[0].payload.date

      return (
        <div className="progress-tooltip">
          <p className="tooltip-value">
            {value} {unit}
          </p>
          <p className="tooltip-date">{formatDate(date)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="progress-chart-container">
      <div className="progress-chart-title">
        {label} ({unit})
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--text-muted)"
            style={{ fontSize: '12px' }}
            interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
          />
          <YAxis stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            dot={{ fill: 'var(--accent)', r: 5 }}
            activeDot={{ r: 7 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
