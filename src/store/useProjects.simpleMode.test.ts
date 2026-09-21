import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@/lib/types'

// useProjects.update() does `supabase.from('projects').update(patch).eq('id', id)` —
// mock just that chain so the test never touches the network, then drive the
// real store logic (optimistic set, then persisted patch) end to end.
const eq = vi.fn().mockResolvedValue({ error: null, data: null })
const update = vi.fn(() => ({ eq }))
const from = vi.fn((_table: string) => ({ update }))
vi.mock('@/lib/supabase', () => ({ supabase: { from } }))

const { useProjects } = await import('@/store/useProjects')

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 'p1',
    name: 'Project',
    codename: '',
    type: 'website',
    state: 'concept',
    summary: '',
    hours_worked: 0,
    position: 0,
    logo_url: null,
    website_url: null,
    test_site_url: null,
    default_screenshot: null,
    github_repo: null,
    verification_token: null,
    platform_project_id: null,
    public_token: null,
    private_token: null,
    position_colors: {},
    priority_colors: {},
    planning_prefs: {},
    platforms: [],
    tech_stack: [],
    countries: [],
    created_by: null,
    created_at: '',
    updated_at: '',
    environment: 'staging',
    simple_mode: false,
    ...overrides,
  }
}

describe('Simple Mode persists per-project', () => {
  beforeEach(() => {
    eq.mockClear()
    update.mockClear()
    from.mockClear()
    useProjects.setState({
      projects: [makeProject({ id: 'project-a' }), makeProject({ id: 'project-b' })],
      loaded: true,
      loading: false,
      error: null,
    })
  })

  it('turns Simple Mode on for one project without affecting another', async () => {
    await useProjects.getState().update('project-a', { simple_mode: true })

    const { projects } = useProjects.getState()
    expect(projects.find((p) => p.id === 'project-a')?.simple_mode).toBe(true)
    expect(projects.find((p) => p.id === 'project-b')?.simple_mode).toBe(false)
  })

  it('persists the change via a real update call scoped to that project id', async () => {
    await useProjects.getState().update('project-a', { simple_mode: true })

    expect(from).toHaveBeenCalledWith('projects')
    expect(update).toHaveBeenCalledWith({ simple_mode: true })
    expect(eq).toHaveBeenCalledWith('id', 'project-a')
  })

  it('can be turned back off independently', async () => {
    await useProjects.getState().update('project-a', { simple_mode: true })
    await useProjects.getState().update('project-a', { simple_mode: false })

    expect(useProjects.getState().projects.find((p) => p.id === 'project-a')?.simple_mode).toBe(false)
  })

  it('rolls back the optimistic update if the save fails', async () => {
    eq.mockResolvedValueOnce({ error: { message: 'network down' }, data: null })

    const { error } = await useProjects.getState().update('project-a', { simple_mode: true })

    expect(error).toBe('network down')
    expect(useProjects.getState().projects.find((p) => p.id === 'project-a')?.simple_mode).toBe(false)
  })
})
