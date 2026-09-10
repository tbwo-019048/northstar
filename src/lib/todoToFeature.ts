import { supabase } from '@/lib/supabase'
import type { Feature } from '@/lib/types'

/**
 * Record a completed To-Do as a Feature row — exactly once per To-Do.
 *
 * Shared by `useProjectData` (per-project store) and `useItems` (global store)
 * so completing a to-do from either the project's To-Do tab or the global
 * Items page has the same effect. The caller is responsible for any optimistic
 * local-state update; this only touches the database.
 *
 * Returns the inserted row, or `null` if a feature already exists for this
 * to-do (or the insert failed).
 */
export async function ensureTodoFeature(todo: {
  id: string
  project_id: string
  title: string
  description?: string | null
}): Promise<Feature | null> {
  const { data: existing } = await supabase
    .from('features')
    .select('id')
    .eq('source_todo_id', todo.id)
    .limit(1)
  if (existing && existing.length) return null

  const { count } = await supabase
    .from('features')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', todo.project_id)

  const { data, error } = await supabase
    .from('features')
    .insert({
      project_id: todo.project_id,
      title: todo.title || 'Feature',
      description: todo.description ?? '',
      source: 'todo',
      source_todo_id: todo.id,
      sort: count ?? 0,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[NorthStar] ensureTodoFeature failed', error)
    return null
  }
  return data as Feature
}
