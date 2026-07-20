import { supabase } from './supabase'
import { findOrCreateExercise, type MuscleGroup } from './exercises'

export type WorkoutStatus = 'planned' | 'done'

export type WorkoutSet = {
  id: number
  position: number
  plan_weight_kg: number | null
  plan_reps: number | null
  fact_weight_kg: number | null
  fact_reps: number | null
}

export type WorkoutExercise = {
  id: number
  position: number
  exercise_id: number
  exercise_name: string
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
}

export type ExerciseInput = {
  exercise_name: string
  sets: SetInput[]
}

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
    .select('id, position, exercise_id, exercises(name)')
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

  const exercises: WorkoutExercise[] = exerciseRows.map((row) => ({
    id: row.id,
    position: row.position,
    exercise_id: row.exercise_id,
    exercise_name: (row.exercises as unknown as { name: string }).name,
    sets: setRows
      .filter((set) => set.workout_exercise_id === row.id)
      .map((set) => ({
        id: set.id,
        position: set.position,
        plan_weight_kg: set.plan_weight_kg,
        plan_reps: set.plan_reps,
        fact_weight_kg: set.fact_weight_kg,
        fact_reps: set.fact_reps,
      })),
  }))

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

export async function copyWorkout(sourceWorkoutId: number, workoutDate: string): Promise<number> {
  const source = await getWorkout(sourceWorkoutId)
  return createWorkout({
    client_id: source.client_id,
    workout_date: workoutDate,
    start_time: source.start_time,
    end_time: source.end_time,
    status: 'planned',
    notes: source.notes,
    exercises: source.exercises.map((exercise) => ({
      exercise_name: exercise.exercise_name,
      sets: exercise.sets.map((set) => ({
        plan_weight_kg: set.plan_weight_kg,
        plan_reps: set.plan_reps,
        fact_weight_kg: set.fact_weight_kg,
        fact_reps: set.fact_reps,
      })),
    })),
  })
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
      })),
    )
    if (setsError) throw setsError
  }
}
