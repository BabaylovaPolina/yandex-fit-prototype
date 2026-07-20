import { supabase } from './supabase'
import { findOrCreateExercise, type MuscleGroup, type InputKind } from './exercises'

export type WorkoutStatus = 'planned' | 'done'

export type WorkoutSet = {
  id: number
  position: number
  plan_weight_kg: number | null
  plan_reps: number | null
  fact_weight_kg: number | null
  fact_reps: number | null
  plan_duration_min: number | null
  plan_distance_km: number | null
  fact_duration_min: number | null
  fact_distance_km: number | null
}

export type WorkoutExercise = {
  id: number
  position: number
  exercise_id: number
  exercise_name: string
  input_kind: InputKind
  sets: WorkoutSet[]
}

export type Workout = {
  id: number
  client_id: number
  workout_date: string
  start_time: string | null
  end_time: string | null
  status: WorkoutStatus
  notes: string | null
  created_at: string
}

export type WorkoutWithExercises = Workout & {
  exercises: WorkoutExercise[]
}

export type SetInput = {
  plan_weight_kg: number | null
  plan_reps: number | null
  fact_weight_kg: number | null
  fact_reps: number | null
  plan_duration_min: number | null
  plan_distance_km: number | null
  fact_duration_min: number | null
  fact_distance_km: number | null
}

export type ExerciseInput = {
  exercise_name: string
  sets: SetInput[]
}

export type CopyExerciseDraft = ExerciseInput & { input_kind: InputKind }

export type WorkoutInput = {
  client_id: number
  workout_date: string
  start_time: string | null
  end_time: string | null
  status: WorkoutStatus
  notes: string | null
  exercises: ExerciseInput[]
}

export async function listWorkouts(clientId: number): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('client_id', clientId)
    .order('workout_date', { ascending: false })

  if (error) throw error
  return data
}

export type WorkoutWithSummary = Workout & { muscleGroups: MuscleGroup[] }

export async function listWorkoutsWithSummary(clientId: number): Promise<WorkoutWithSummary[]> {
  const { data: workoutRows, error: workoutsError } = await supabase
    .from('workouts')
    .select('*')
    .eq('client_id', clientId)
    .order('workout_date', { ascending: false })
  if (workoutsError) throw workoutsError

  const workoutIds = workoutRows.map((w) => w.id)
  if (workoutIds.length === 0) return []

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('workout_exercises')
    .select('workout_id, position, exercises(muscle_group)')
    .in('workout_id', workoutIds)
    .order('position')
  if (exercisesError) throw exercisesError

  return workoutRows.map((workout) => {
    const groups: MuscleGroup[] = []
    for (const row of exerciseRows) {
      if (row.workout_id !== workout.id) continue
      const group = (row.exercises as unknown as { muscle_group: MuscleGroup }).muscle_group
      if (!groups.includes(group)) groups.push(group)
    }
    return { ...workout, muscleGroups: groups }
  })
}

export type WorkoutWithClientName = Workout & { client_name: string }

export async function listWorkoutsForDate(date: string): Promise<WorkoutWithClientName[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, clients(full_name)')
    .eq('workout_date', date)
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data.map((row) => {
    const { clients, ...workout } = row as Workout & { clients: { full_name: string } | null }
    return { ...workout, client_name: clients?.full_name ?? '—' }
  })
}

export async function getWorkout(workoutId: number): Promise<WorkoutWithExercises> {
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single()
  if (workoutError) throw workoutError

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('workout_exercises')
    .select('id, position, exercise_id, exercises(name, input_kind)')
    .eq('workout_id', workoutId)
    .order('position')
  if (exercisesError) throw exercisesError

  const exerciseIds = exerciseRows.map((row) => row.id)
  const { data: setRows, error: setsError } =
    exerciseIds.length === 0
      ? { data: [] as WorkoutSet[] & { workout_exercise_id: number }[], error: null }
      : await supabase
          .from('workout_sets')
          .select('*')
          .in('workout_exercise_id', exerciseIds)
          .order('position')
  if (setsError) throw setsError

  const exercises: WorkoutExercise[] = exerciseRows.map((row) => {
    const exerciseInfo = row.exercises as unknown as { name: string; input_kind: InputKind }
    return {
      id: row.id,
      position: row.position,
      exercise_id: row.exercise_id,
      exercise_name: exerciseInfo.name,
      input_kind: exerciseInfo.input_kind,
      sets: setRows
        .filter((set) => set.workout_exercise_id === row.id)
        .map((set) => ({
          id: set.id,
          position: set.position,
          plan_weight_kg: set.plan_weight_kg,
          plan_reps: set.plan_reps,
          fact_weight_kg: set.fact_weight_kg,
          fact_reps: set.fact_reps,
          plan_duration_min: set.plan_duration_min,
          plan_distance_km: set.plan_distance_km,
          fact_duration_min: set.fact_duration_min,
          fact_distance_km: set.fact_distance_km,
        })),
    }
  })

  return { ...workout, exercises }
}

export async function createWorkout(input: WorkoutInput): Promise<number> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const trainerId = userData.user?.id
  if (!trainerId) throw new Error('Not authenticated')

  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      trainer_id: trainerId,
      client_id: input.client_id,
      workout_date: input.workout_date,
      start_time: input.start_time,
      end_time: input.end_time,
      status: input.status,
      notes: input.notes,
    })
    .select()
    .single()
  if (workoutError) throw workoutError

  await writeExercises(workout.id, input.exercises)
  return workout.id
}

export async function updateWorkout(workoutId: number, input: WorkoutInput): Promise<void> {
  const { error: workoutError } = await supabase
    .from('workouts')
    .update({
      client_id: input.client_id,
      workout_date: input.workout_date,
      start_time: input.start_time,
      end_time: input.end_time,
      status: input.status,
      notes: input.notes,
    })
    .eq('id', workoutId)
  if (workoutError) throw workoutError

  const { error: deleteError } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('workout_id', workoutId)
  if (deleteError) throw deleteError

  await writeExercises(workoutId, input.exercises)
}

export async function deleteWorkout(workoutId: number): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
  if (error) throw error
}

export async function updateSetFact(
  setId: number,
  fact: Partial<{
    fact_weight_kg: number | null
    fact_reps: number | null
    fact_duration_min: number | null
    fact_distance_km: number | null
  }>,
): Promise<void> {
  const { error } = await supabase.from('workout_sets').update(fact).eq('id', setId)
  if (error) throw error
}

export async function updateWorkoutStatus(workoutId: number, status: WorkoutStatus): Promise<void> {
  const { error } = await supabase.from('workouts').update({ status }).eq('id', workoutId)
  if (error) throw error
}

export async function addExerciseToWorkout(
  workoutId: number,
  exerciseName: string,
): Promise<WorkoutExercise> {
  const exercise = await findOrCreateExercise(exerciseName)

  const { count } = await supabase
    .from('workout_exercises')
    .select('id', { count: 'exact', head: true })
    .eq('workout_id', workoutId)

  const { data: workoutExercise, error } = await supabase
    .from('workout_exercises')
    .insert({ workout_id: workoutId, exercise_id: exercise.id, position: count ?? 0 })
    .select()
    .single()
  if (error) throw error

  return {
    id: workoutExercise.id,
    position: workoutExercise.position,
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    input_kind: exercise.input_kind,
    sets: [],
  }
}

export async function addSetToExercise(workoutExerciseId: number): Promise<WorkoutSet> {
  const { count } = await supabase
    .from('workout_sets')
    .select('id', { count: 'exact', head: true })
    .eq('workout_exercise_id', workoutExerciseId)

  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      workout_exercise_id: workoutExerciseId,
      position: count ?? 0,
      plan_weight_kg: null,
      plan_reps: null,
      fact_weight_kg: null,
      fact_reps: null,
      plan_duration_min: null,
      plan_distance_km: null,
      fact_duration_min: null,
      fact_distance_km: null,
    })
    .select()
    .single()
  if (error) throw error

  return {
    id: data.id,
    position: data.position,
    plan_weight_kg: data.plan_weight_kg,
    plan_reps: data.plan_reps,
    fact_weight_kg: data.fact_weight_kg,
    fact_reps: data.fact_reps,
    plan_duration_min: data.plan_duration_min,
    plan_distance_km: data.plan_distance_km,
    fact_duration_min: data.fact_duration_min,
    fact_distance_km: data.fact_distance_km,
  }
}

export function buildCopyDraft(source: WorkoutWithExercises): CopyExerciseDraft[] {
  return source.exercises.map((exercise) => ({
    exercise_name: exercise.exercise_name,
    input_kind: exercise.input_kind,
    sets: exercise.sets.map((set) => ({
      plan_weight_kg: set.fact_weight_kg ?? set.plan_weight_kg,
      plan_reps: set.fact_reps ?? set.plan_reps,
      fact_weight_kg: null,
      fact_reps: null,
      plan_duration_min: set.fact_duration_min ?? set.plan_duration_min,
      plan_distance_km: set.fact_distance_km ?? set.plan_distance_km,
      fact_duration_min: null,
      fact_distance_km: null,
    })),
  }))
}

export type ExerciseHistoryEntry = {
  workout_id: number
  workout_date: string
  sets: WorkoutSet[]
}

export async function getExerciseHistory(
  clientId: number,
  exerciseId: number,
): Promise<ExerciseHistoryEntry[]> {
  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('workout_exercises')
    .select('id, workout_id, workouts!inner(id, workout_date, client_id, status)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.client_id', clientId)
    .eq('workouts.status', 'done')
  if (exercisesError) throw exercisesError

  if (exerciseRows.length === 0) return []

  const exerciseIds = exerciseRows.map((row) => row.id)
  const { data: setRows, error: setsError } = await supabase
    .from('workout_sets')
    .select('*')
    .in('workout_exercise_id', exerciseIds)
    .order('position')
  if (setsError) throw setsError

  return exerciseRows
    .map((row) => {
      const workout = row.workouts as unknown as { workout_date: string }
      return {
        workout_id: row.workout_id,
        workout_date: workout.workout_date,
        sets: setRows
          .filter((set) => set.workout_exercise_id === row.id)
          .map((set) => ({
            id: set.id,
            position: set.position,
            plan_weight_kg: set.plan_weight_kg,
            plan_reps: set.plan_reps,
            fact_weight_kg: set.fact_weight_kg,
            fact_reps: set.fact_reps,
            plan_duration_min: set.plan_duration_min,
            plan_distance_km: set.plan_distance_km,
            fact_duration_min: set.fact_duration_min,
            fact_distance_km: set.fact_distance_km,
          })),
      }
    })
    .sort((a, b) => a.workout_date.localeCompare(b.workout_date))
}

async function writeExercises(workoutId: number, exercises: ExerciseInput[]) {
  for (let i = 0; i < exercises.length; i++) {
    const exerciseInput = exercises[i]
    const exercise = await findOrCreateExercise(exerciseInput.exercise_name)

    const { data: workoutExercise, error: workoutExerciseError } = await supabase
      .from('workout_exercises')
      .insert({ workout_id: workoutId, exercise_id: exercise.id, position: i })
      .select()
      .single()
    if (workoutExerciseError) throw workoutExerciseError

    if (exerciseInput.sets.length === 0) continue

    const { error: setsError } = await supabase.from('workout_sets').insert(
      exerciseInput.sets.map((set, position) => ({
        workout_exercise_id: workoutExercise.id,
        position,
        plan_weight_kg: set.plan_weight_kg,
        plan_reps: set.plan_reps,
        fact_weight_kg: set.fact_weight_kg,
        fact_reps: set.fact_reps,
        plan_duration_min: set.plan_duration_min,
        plan_distance_km: set.plan_distance_km,
        fact_duration_min: set.fact_duration_min,
        fact_distance_km: set.fact_distance_km,
      })),
    )
    if (setsError) throw setsError
  }
}
