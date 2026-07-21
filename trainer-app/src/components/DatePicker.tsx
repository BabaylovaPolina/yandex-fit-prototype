import { useEffect, useRef, useState } from 'react'

type Props = {
  value: string
  onChange: (date: string) => void
  disabled?: boolean
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplay(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
}

export function DatePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [year, month] = value ? value.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1]
  const [viewYear, setViewYear] = useState(year)
  const [viewMonth, setViewMonth] = useState(month - 1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function openPanel() {
    if (disabled) return
    if (value) {
      const [y, m] = value.split('-').map(Number)
      setViewYear(y)
      setViewMonth(m - 1)
    }
    setOpen(true)
  }

  function changeMonth(delta: number) {
    let newMonth = viewMonth + delta
    let newYear = viewYear
    if (newMonth < 0) {
      newMonth = 11
      newYear -= 1
    } else if (newMonth > 11) {
      newMonth = 0
      newYear += 1
    }
    setViewMonth(newMonth)
    setViewYear(newYear)
  }

  function selectDay(day: number) {
    onChange(toKey(viewYear, viewMonth, day))
    setOpen(false)
  }

  function selectToday() {
    const now = new Date()
    onChange(toKey(now.getFullYear(), now.getMonth(), now.getDate()))
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setOpen(false)
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { day: number; outside: boolean; key: string }[] = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ day, outside: true, key: toKey(y, m, day) })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, outside: false, key: toKey(viewYear, viewMonth, day) })
  }
  while (cells.length % 7 !== 0) {
    const day = cells.length - (startWeekday + daysInMonth) + 1
    const m = viewMonth === 11 ? 0 : viewMonth + 1
    const y = viewMonth === 11 ? viewYear + 1 : viewYear
    cells.push({ day, outside: true, key: toKey(y, m, day) })
  }

  const todayKey = (() => {
    const now = new Date()
    return toKey(now.getFullYear(), now.getMonth(), now.getDate())
  })()

  return (
    <div className="date-picker" ref={containerRef}>
      <button
        type="button"
        className="date-picker-button"
        onClick={openPanel}
        disabled={disabled}
      >
        <span>{value ? formatDisplay(value) : 'Выберите дату'}</span>
        <span className="date-picker-icon">📅</span>
      </button>

      {open && (
        <div className="date-picker-panel">
          <div className="date-picker-header">
            <button type="button" onClick={() => changeMonth(-1)}>‹</button>
            <span className="date-picker-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={() => changeMonth(1)}>›</button>
          </div>

          <div className="date-picker-weekdays">
            {WEEKDAYS.map((wd) => (
              <span key={wd}>{wd}</span>
            ))}
          </div>

          <div className="date-picker-days">
            {cells.map((cell) => (
              <button
                key={cell.key}
                type="button"
                className={[
                  'date-picker-day',
                  cell.outside ? 'outside' : '',
                  cell.key === value ? 'selected' : '',
                  cell.key === todayKey ? 'today' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => selectDay(cell.day)}
              >
                {cell.day}
              </button>
            ))}
          </div>

          <div className="date-picker-footer">
            <button type="button" onClick={selectToday}>Сегодня</button>
          </div>
        </div>
      )}
    </div>
  )
}
