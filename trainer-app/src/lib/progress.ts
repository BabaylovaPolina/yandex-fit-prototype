import { supabase } from './supabase'

export type ProgressRecord = {
  id: number
  client_id: number
  recorded_date: string
  weight_kg: number | null
  chest_cm: number | null
  waist_cm: number | null
  hip_cm: number | null
  notes: string | null
  created_at: string
}

export type CustomMetric = {
  id: number
  client_id: number
  metric_name: string
  metric_unit: string | null
  is_active: boolean
  created_at: string
}

export type CustomMetricValue = {
  id: number
  custom_metric_id: number
  recorded_date: string
  value: number | null
  created_at: string
}

export type ProgressInput = {
  client_id: number
  recorded_date: string
  weight_kg: number | null
  chest_cm: number | null
  waist_cm: number | null
  hip_cm: number | null
  notes: string | null
}

export const SUGGESTED_CUSTOM_METRICS = [
  { name: 'Мышечная масса', unit: 'кг' },
  { name: 'Процент жира', unit: '%' },
  { name: 'Бицепс', unit: 'см' },
  { name: 'Плечо', unit: 'см' },
  { name: 'Предплечье', unit: 'см' },
  { name: 'Икры', unit: 'см' },
  { name: 'Бёдро', unit: 'см' },
]

// Main metrics functions
export async function listProgress(clientId: number, limit?: number): Promise<ProgressRecord[]> {
  let query = supabase
    .from('client_progress')
    .select('*')
    .eq('client_id', clientId)
    .order('recorded_date', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getProgressByDate(
  clientId: number,
  date: string,
): Promise<ProgressRecord | null> {
  const { data, error } = await supabase
    .from('client_progress')
    .select('*')
    .eq('client_id', clientId)
    .eq('recorded_date', date)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function addProgress(input: ProgressInput): Promise<ProgressRecord> {
  const { data, error } = await supabase
    .from('client_progress')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProgress(id: number, input: ProgressInput): Promise<void> {
  const { error } = await supabase
    .from('client_progress')
    .update(input)
    .eq('id', id)

  if (error) throw error
}

export async function deleteProgress(id: number): Promise<void> {
  const { error } = await supabase
    .from('client_progress')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Custom metrics functions
export async function listCustomMetrics(clientId: number): Promise<CustomMetric[]> {
  const { data, error } = await supabase
    .from('client_custom_metrics')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addCustomMetric(
  clientId: number,
  metricName: string,
  metricUnit?: string,
): Promise<CustomMetric> {
  const { data, error } = await supabase
    .from('client_custom_metrics')
    .insert({
      client_id: clientId,
      metric_name: metricName,
      metric_unit: metricUnit || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCustomMetric(
  id: number,
  updates: Partial<CustomMetric>,
): Promise<void> {
  const { error } = await supabase
    .from('client_custom_metrics')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function deleteCustomMetric(id: number): Promise<void> {
  const { error } = await supabase
    .from('client_custom_metrics')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Custom metric values functions
export async function listCustomMetricValues(customMetricId: number): Promise<CustomMetricValue[]> {
  const { data, error } = await supabase
    .from('client_progress_custom')
    .select('*')
    .eq('custom_metric_id', customMetricId)
    .order('recorded_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addCustomMetricValue(
  customMetricId: number,
  recordedDate: string,
  value: number,
): Promise<CustomMetricValue> {
  const { data, error } = await supabase
    .from('client_progress_custom')
    .insert({
      custom_metric_id: customMetricId,
      recorded_date: recordedDate,
      value,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCustomMetricValue(id: number, value: number): Promise<void> {
  const { error } = await supabase
    .from('client_progress_custom')
    .update({ value })
    .eq('id', id)

  if (error) throw error
}

export async function deleteCustomMetricValue(id: number): Promise<void> {
  const { error } = await supabase
    .from('client_progress_custom')
    .delete()
    .eq('id', id)

  if (error) throw error
}
