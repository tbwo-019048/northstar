export const WORKSPACE_STATES = ['staging', 'production'] as const

export type WorkspaceState = (typeof WORKSPACE_STATES)[number]

export const WORKSPACE_STATE_LABEL: Record<WorkspaceState, string> = {
  staging: 'Staging',
  production: 'Production',
}

export function isWorkspaceState(value: unknown): value is WorkspaceState {
  return value === 'staging' || value === 'production'
}
