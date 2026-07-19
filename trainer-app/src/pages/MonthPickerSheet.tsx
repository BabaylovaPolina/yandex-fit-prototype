import { useState } from 'react'

const WEEKDAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
  // getDay(): 0=Sunday..6=Saturday; grid starts on Monday, so shift Sunday to the end
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const cells: (Date | null)[] = Array(firstWeekday).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day))
  }
  return cells
}

type Props = {
  selectedDate: string
  onPick: (date: Date) => void
  onClose: () => void
}

export function MonthPickerSheet({ selectedDate, onPick, onClose }: Props) {
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(new Date(selectedDate + 'T00:00:00')),
  )
  const todayKey = toDateKey(new Date())

  function goToMonth(offset: number) {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const cells = buildMonthGrid(monthCursor)

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button type="button" className="week-nav-arrow" onClick={() => goToMonth(-1)} aria-label="Предыдущий месяц">
            ‹
          </button>
          <span className="sheet-title">
            {MONTH_LABELS[monthCursor.getMonth()]} {monthCursor.getFullYear()}
          </span>
          <button type="button" className="week-nav-arrow" onClick={() => goToMonth(1)} aria-label="Следующий месяц">
            ›
          </button>
        </div>

        <div className="month-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="month-weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="month-grid">
          {cells.map((date, i) =>
            date === null ? (
              <span key={`empty-${i}`} />
            ) : (
              <button
                key={toDateKey(date)}
                type="button"
                className={
                  toDateKey(date) === selectedDate
                    ? 'month-day active'
                    : toDateKey(date) === todayKey
                      ? 'month-day today'
                      : 'month-day'
                }
                onClick={() => onPick(date)}
              >
                {date.getDate()}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
