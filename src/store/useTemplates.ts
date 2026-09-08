import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { ProjectTemplate, ProjectType, TemplatePayload } from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'

interface TemplatesState {
  templates: ProjectTemplate[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  create: (
    name: string,
    description: string,
    type: ProjectType | null,
    payload: TemplatePayload,
  ) => Promise<{ template: ProjectTemplate | null; error: string | null }>
  update: (id: string, patch: Partial<ProjectTemplate>) => Promise<{ error: string | null }>
  remove: (id: string) => Promise<void>
  subscribe: () => () => void
}

export const useTemplates = create<TemplatesState>((set, get) => ({
  templates: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .order('created_at', { ascending: true })
    set({
      templates: (data as ProjectTemplate[]) ?? [],
      loading: false,
      loaded: true,
      error: error?.message ?? null,
    })
  },

  create: async (name, description, type, payload) => {
    const { data, error } = await supabase
      .from('project_templates')
      .insert({ name, description, type, payload })
      .select('*')
      .single()
    if (error) {
      console.error('[NorthStar] create template failed', error)
      set({ error: error.message })
      notifySaveError(error.message)
      return { template: null, error: error.message }
    }
    if (data) set({ templates: [...get().templates, data as ProjectTemplate] })
    notifySaved('Template saved.')
    return { template: (data as ProjectTemplate) ?? null, error: null }
  },

  update: async (id, patch) => {
    const previous = get().templates
    set({ templates: previous.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
    const { error } = await supabase.from('project_templates').update(patch).eq('id', id)
    if (error) {
      console.error('[NorthStar] update template failed', error)
      set({ templates: previous, error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    notifySaved()
    return { error: null }
  },

  remove: async (id) => {
    const previous = get().templates
    set({ templates: previous.filter((t) => t.id !== id) })
    const { error } = await supabase.from('project_templates').delete().eq('id', id)
    if (error) {
      set({ templates: previous, error: error.message })
      notifySaveError(error.message)
      return
    }
    notifySaved('Template removed.')
  },

  subscribe: () => {
    const ch = supabase
      .channel('templates-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_templates' }, () => {
        get().load()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  },
}))

/** Bulk-insert a template's rows into a freshly created project. The project's
 * per-project store isn't loaded at this point, so this writes to Supabase
 * directly; navigating to the project afterwards triggers the normal load. */
export async function seedProjectFromTemplate(
  projectId: string,
  payload: TemplatePayload,
): Promise<{ failed: number }> {
  let failed = 0
  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p
    if (error) {
      failed++
      console.error('[NorthStar] seed from template failed', error)
    }
  }

  if (payload.details?.length) {
    await run(
      supabase.from('details').insert(
        payload.details.map((d, i) => ({
          project_id: projectId,
          section: d.section || 'General',
          label: d.label ?? '',
          value: d.value ?? '',
          sort: i,
        })),
      ),
    )
  }

  if (payload.features?.length) {
    await run(
      supabase.from('features').insert(
        payload.features.map((f, i) => ({
          project_id: projectId,
          title: f.title ?? '',
          description: f.description ?? '',
          source: 'manual',
          sort: i,
        })),
      ),
    )
  }

  if (payload.todos?.length) {
    await run(
      supabase.from('todos').insert(
        payload.todos.map((t, i) => ({
          project_id: projectId,
          title: t.title ?? '',
          subtitle: t.subtitle ?? '',
          type: t.type || 'feature',
          priority: t.priority || 'medium',
          status: 'todo',
          description: t.description ?? '',
          sort: i,
        })),
      ),
    )
  }

  if (payload.plan_items?.length) {
    await run(
      supabase.from('plan_items').insert(
        payload.plan_items.map((p, i) => ({
          project_id: projectId,
          title: p.title ?? '',
          description: p.description ?? '',
          status: p.status || 'requested',
          priority: typeof p.priority === 'number' ? p.priority : 5,
          sort: i,
        })),
      ),
    )
  }

  for (const [i, pipe] of (payload.pipelines ?? []).entries()) {
    const { data, error } = await supabase
      .from('pipelines')
      .insert({
        project_id: projectId,
        name: pipe.name || `Pipeline ${i + 1}`,
        status: 'active',
        estimate_hours: pipe.estimate_hours || 0,
        sort: i,
      })
      .select('id')
      .single()
    if (error || !data) {
      failed++
      console.error('[NorthStar] seed pipeline failed', error)
      continue
    }
    if (pipe.items?.length) {
      await run(
        supabase.from('pipeline_items').insert(
          pipe.items.map((body, j) => ({ pipeline_id: (data as { id: string }).id, body, sort: j })),
        ),
      )
    }
  }

  return { failed }
}
