import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
  windowEnd: string | null
  onWindowChange: (windowEnd: string | null) => void
}

const WINDOW_DAYS = 30

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function clampDate(dateStr: string, min: string, max: string): string {
  if (dateStr < min) return min
  if (dateStr > max) return max
  return dateStr
}

function computeYDomain(values: number[]): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.1, 1)
    return [min - pad, max + pad]
  }
  const range = max - min
  const pad = range * 0.15
  return [Math.floor(min - pad), Math.ceil(max + pad)]
}

const METRIC_LABELS: Record<string, { label: string; unit: string; key: keyof ProgressRecord }> = {
  weight: { label: 'Вес', unit: 'кг', key: 'weight_kg' },
  chest: { label: 'Грудь', unit: 'см', key: 'chest_cm' },
  waist: { label: 'Талия', unit: 'см', key: 'waist_cm' },
  hip: { label: 'Бёдра', unit: 'см', key: 'hip_cm' },
}

export function ProgressChart({ data, customData, metric, windowEnd, onWindowChange }: Props) {
  const isCustom = typeof metric === 'object'
  const metricKey = isCustom ? undefined : METRIC_LABELS[metric].key

  const dragAreaRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; windowEnd: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Prepare data for chart, oldest to newest so the x-axis reads left to right
  const chartData = (
    isCustom
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
  ).sort((a, b) => a.date.localeCompare(b.date))

  if (chartData.length === 0) {
    return (
      <div className="progress-chart-empty">
        <p>Нет данных для отображения</p>
      </div>
    )
  }

  const minDate = chartData[0].date
  const maxDate = chartData[chartData.length - 1].date
  const earliestWindowEnd = addDays(minDate, WINDOW_DAYS - 1)
  const canDrag = earliestWindowEnd < maxDate

  const effectiveEnd = clampDate(windowEnd ?? maxDate, earliestWindowEnd, maxDate)
  const windowStart = addDays(effectiveEnd, -(WINDOW_DAYS - 1))
  const visibleData = chartData.filter((item) => item.date >= windowStart && item.date <= effectiveEnd)
  const yDomain: [number, number] | undefined =
    visibleData.length > 0 ? computeYDomain(visibleData.map((item) => item.value as number)) : undefined

  const visibleValues = visibleData.map((item) => item.value as number)
  const minValue = visibleValues.length > 0 ? Math.min(...visibleValues) : undefined
  const maxValue = visibleValues.length > 0 ? Math.max(...visibleValues) : undefined
  const minIndex = minValue !== undefined ? visibleData.findIndex((item) => item.value === minValue) : -1
  const maxIndex = maxValue !== undefined ? visibleData.findIndex((item) => item.value === maxValue) : -1

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canDrag) return
    dragStartRef.current = { x: e.clientX, windowEnd: effectiveEnd }
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current || !dragAreaRef.current) return
    const containerWidth = dragAreaRef.current.getBoundingClientRect().width
    const pxPerDay = containerWidth / WINDOW_DAYS
    const deltaPx = e.clientX - dragStartRef.current.x
    const deltaDays = Math.round(deltaPx / pxPerDay)
    const newEnd = clampDate(
      addDays(dragStartRef.current.windowEnd, deltaDays),
      earliestWindowEnd,
      maxDate,
    )
    onWindowChange(newEnd)
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragStartRef.current = null
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
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
        {canDrag && <span className="progress-chart-range"> · {formatShortDate(windowStart)} – {formatShortDate(effectiveEnd)}</span>}
      </div>
      {visibleData.length === 0 ? (
        <div className="progress-chart-empty">
          <p>Нет данных за этот период</p>
          <button type="button" className="btn-secondary" onClick={() => onWindowChange(null)}>
            Показать последние 30 дней
          </button>
        </div>
      ) : (
        <div
          ref={dragAreaRef}
          className={`progress-chart-drag-area${isDragging ? ' dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visibleData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                height={40}
                tick={AxisTick}
                interval={Math.max(0, Math.ceil(visibleData.length / 5) - 1)}
              />
              <YAxis stroke="var(--text-muted)" style={{ fontSize: '12px' }} domain={yDomain} allowDecimals />
              {!isDragging && <Tooltip content={<CustomTooltip />} />}
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                dot={(dotProps: { cx?: number; cy?: number; index?: number; payload?: { value: number | null } }) =>
                  renderChartDot(dotProps, minIndex, maxIndex, visibleData.length)
                }
                activeDot={{ r: 7 }}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
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

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function formatAxisTick(dateStr: string): [string, string] {
  const date = new Date(dateStr + 'T00:00:00')
  const day = new Intl.DateTimeFormat('ru-RU', { day: '2-digit' }).format(date)
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date).replace('.', '')
  return [day, month]
}

function renderChartDot(
  props: { cx?: number; cy?: number; index?: number; payload?: { value: number | null } },
  minIndex: number,
  maxIndex: number,
  totalPoints: number,
) {
  const { cx, cy, index, payload } = props
  if (cx === undefined || cy === undefined || index === undefined) return <g key={index} />

  const isMax = index === maxIndex
  const isMin = index === minIndex && minIndex !== maxIndex

  if (!isMax && !isMin) {
    return <circle key={index} cx={cx} cy={cy} r={5} fill="var(--accent)" />
  }

  const dy = isMax ? -12 : 18
  const isFirst = index === 0
  const isLast = index === totalPoints - 1
  const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
  const textX = isFirst ? cx + 6 : isLast ? cx - 6 : cx

  return (
    <g key={index}>
      <circle cx={cx} cy={cy} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
      <text x={textX} y={cy + dy} textAnchor={textAnchor} fontSize={12} fontWeight={600} fill="var(--accent)">
        {payload?.value}
      </text>
    </g>
  )
}

function AxisTick({
  x,
  y,
  payload,
}: {
  x?: number | string
  y?: number | string
  payload?: { value: string }
}) {
  const [day, month] = formatAxisTick(payload?.value ?? '')
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
        {day}
      </text>
      <text dy={26} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
        {month}
      </text>
    </g>
  )
}
