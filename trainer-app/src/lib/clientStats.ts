import type { WorkoutWithSummary } from '../db/workouts'

const ATTENTION_DAYS = 14

export function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(fromKey).getTime()
  const to = new Date(toKey).getTime()
  return Math.round((to - from) / (1000 * 60 * 60 * 24))
}

export function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня'
  return 'дней'
}

export type ClientStats = {
  lastWorkoutDate: string | null
  doneCount: number
  completionPercent: number | null
  daysInWork: number
  needsAttention: boolean
}

export function computeClientStats(
  workouts: WorkoutWithSummary[],
  clientCreatedAt: string,
  today: string,
): ClientStats {
  const done = workouts.filter((w) => w.status === 'done')
  const missed = workouts.filter((w) => w.status === 'planned' && w.workout_date < today)

  const lastWorkoutDate =
    done.length > 0
      ? done.reduce((max, w) => (w.workout_date > max ? w.workout_date : max), done[0].workout_date)
      : null

  const denominator = done.length + missed.length
  const completionPercent = denominator === 0 ? null : Math.round((done.length / denominator) * 100)

  const daysInWork = Math.max(0, daysBetween(clientCreatedAt.slice(0, 10), today))

  const needsAttention = lastWorkoutDate
    ? daysBetween(lastWorkoutDate, today) >= ATTENTION_DAYS
    : daysInWork >= ATTENTION_DAYS

  return { lastWorkoutDate, doneCount: done.length, completionPercent, daysInWork, needsAttention }
}
