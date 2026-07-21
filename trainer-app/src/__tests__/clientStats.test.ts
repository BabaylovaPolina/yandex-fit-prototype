import { describe, it, expect } from 'vitest'
import { computeClientStats } from '../lib/clientStats'
import type { WorkoutWithSummary } from '../db/workouts'

function workout(partial: Partial<WorkoutWithSummary>): WorkoutWithSummary {
  return {
    id: 1,
    client_id: 1,
    workout_date: '2026-07-01',
    start_time: null,
    end_time: null,
    status: 'planned',
    notes: null,
    created_at: '2026-07-01T00:00:00Z',
    muscleGroups: [],
    ...partial,
  }
}

const TODAY = '2026-07-21'

describe('computeClientStats', () => {
  it('counts only done workouts and finds the latest done date', () => {
    const workouts = [
      workout({ id: 1, status: 'done', workout_date: '2026-07-05' }),
      workout({ id: 2, status: 'done', workout_date: '2026-07-18' }),
      workout({ id: 3, status: 'planned', workout_date: '2026-07-25' }),
    ]
    const stats = computeClientStats(workouts, '2026-07-01T00:00:00Z', TODAY)
    expect(stats.doneCount).toBe(2)
    expect(stats.lastWorkoutDate).toBe('2026-07-18')
  })

  it('computes completion percent as done / (done + missed)', () => {
    const workouts = [
      workout({ id: 1, status: 'done', workout_date: '2026-07-05' }),
      workout({ id: 2, status: 'done', workout_date: '2026-07-10' }),
      workout({ id: 3, status: 'done', workout_date: '2026-07-12' }),
      // missed: planned in the past
      workout({ id: 4, status: 'planned', workout_date: '2026-07-08' }),
      // future planned should not count toward denominator
      workout({ id: 5, status: 'planned', workout_date: '2026-07-30' }),
    ]
    const stats = computeClientStats(workouts, '2026-07-01T00:00:00Z', TODAY)
    // 3 done / (3 done + 1 missed) = 75%
    expect(stats.completionPercent).toBe(75)
  })

  it('returns null completion when there are no done or missed workouts', () => {
    const workouts = [workout({ id: 1, status: 'planned', workout_date: '2026-07-30' })]
    const stats = computeClientStats(workouts, '2026-07-20T00:00:00Z', TODAY)
    expect(stats.completionPercent).toBeNull()
  })

  it('computes days in work from client creation date', () => {
    const stats = computeClientStats([], '2026-07-01T00:00:00Z', TODAY)
    expect(stats.daysInWork).toBe(20)
  })

  it('flags needs attention when last done workout is 14+ days ago', () => {
    const workouts = [workout({ id: 1, status: 'done', workout_date: '2026-07-05' })]
    const stats = computeClientStats(workouts, '2026-06-01T00:00:00Z', TODAY)
    // last done 2026-07-05, today 2026-07-21 = 16 days ago
    expect(stats.needsAttention).toBe(true)
  })

  it('does not flag attention when recently trained', () => {
    const workouts = [workout({ id: 1, status: 'done', workout_date: '2026-07-18' })]
    const stats = computeClientStats(workouts, '2026-06-01T00:00:00Z', TODAY)
    expect(stats.needsAttention).toBe(false)
  })

  it('flags attention for a client with no workouts added 14+ days ago', () => {
    const stats = computeClientStats([], '2026-06-01T00:00:00Z', TODAY)
    expect(stats.needsAttention).toBe(true)
  })

  it('does not flag attention for a brand new client with no workouts', () => {
    const stats = computeClientStats([], '2026-07-20T00:00:00Z', TODAY)
    expect(stats.needsAttention).toBe(false)
  })
})
