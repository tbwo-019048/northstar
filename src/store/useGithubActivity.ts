import { create } from 'zustand'
import { getGithubToken } from '@/store/useSettings'
import { fetchCommitActivity, type CommitDay } from '@/lib/github'

type RepoResult = CommitDay[] | 'error'

interface GithubActivityState {
  byRepo: Record<string, RepoResult>
  loading: boolean
  /** Fetch commit activity for any of `repos` not already cached this session. */
  load: (repos: string[]) => Promise<void>
}

async function pooled<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      await work(next)
    }
  })
  await Promise.all(workers)
}

export const useGithubActivity = create<GithubActivityState>((set, get) => ({
  byRepo: {},
  loading: false,

  load: async (repos) => {
    const wanted = [...new Set(repos.filter(Boolean))].filter((r) => !(r in get().byRepo))
    if (wanted.length === 0) return

    set({ loading: true })
    const token = await getGithubToken()
    if (!token) {
      set((s) => ({
        loading: false,
        byRepo: { ...s.byRepo, ...Object.fromEntries(wanted.map((r) => [r, 'error' as const])) },
      }))
      return
    }

    await pooled(wanted, 4, async (repo) => {
      try {
        const days = await fetchCommitActivity(repo, token)
        set((s) => ({ byRepo: { ...s.byRepo, [repo]: days } }))
      } catch {
        set((s) => ({ byRepo: { ...s.byRepo, [repo]: 'error' } }))
      }
    })
    set({ loading: false })
  },
}))

/** Sum day → total commits across the given repos. */
export function mergeCounts(
  byRepo: Record<string, RepoResult>,
  repos: string[],
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const repo of new Set(repos)) {
    const result = byRepo[repo]
    if (!Array.isArray(result)) continue
    for (const { day, count } of result) out[day] = (out[day] ?? 0) + count
  }
  return out
}
