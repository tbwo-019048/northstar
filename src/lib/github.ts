export interface GithubCommit {
  sha: string
  parents: string[]
  message: string
  authorName: string
  authorLogin: string | null
  authorAvatar: string | null
  date: string
  url: string
}

export interface GithubBranch {
  name: string
  sha: string
}

/** One calendar day and how many commits landed on it (UTC). */
export interface CommitDay {
  day: string // 'YYYY-MM-DD'
  count: number
}

export class GithubApiError extends Error {}

/** Accepts "owner/repo", a full GitHub URL, or that URL with ".git". */
export function parseRepo(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/\.git$/, '').replace(/\/$/, '')
  const urlMatch = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)$/i)
  const short = urlMatch ? `${urlMatch[1]}/${urlMatch[2]}` : cleaned
  const m = short.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

async function ghFetch(url: string, token: string, notFoundMessage: string) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).message ?? detail
    } catch {
      /* ignore */
    }
    if (res.status === 404) throw new GithubApiError(notFoundMessage)
    if (res.status === 401) throw new GithubApiError('GitHub token is invalid or expired.')
    if (res.status === 403) throw new GithubApiError(`GitHub API refused the request: ${detail}`)
    throw new GithubApiError(`GitHub API error ${res.status}: ${detail}`)
  }
  return res
}

export async function fetchDefaultBranch(repo: string, token: string): Promise<string> {
  const parsed = parseRepo(repo)
  if (!parsed) throw new GithubApiError(`"${repo}" doesn't look like "owner/repo".`)
  const res = await ghFetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
    token,
    `Repository "${parsed.owner}/${parsed.repo}" not found (or the token can't see it).`,
  )
  const data = (await res.json()) as { default_branch: string }
  return data.default_branch
}

export async function fetchBranches(repo: string, token: string): Promise<GithubBranch[]> {
  const parsed = parseRepo(repo)
  if (!parsed) throw new GithubApiError(`"${repo}" doesn't look like "owner/repo".`)
  const res = await ghFetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=100`,
    token,
    `Repository "${parsed.owner}/${parsed.repo}" not found (or the token can't see it).`,
  )
  const data = (await res.json()) as Array<{ name: string; commit: { sha: string } }>
  return data.map((b) => ({ name: b.name, sha: b.commit.sha }))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Daily commit counts for the last ~52 weeks, from GitHub's
 * `stats/commit_activity` endpoint (one request). A cold repo answers 202
 * while GitHub computes the stats — we retry once, then give up with [].
 */
export async function fetchCommitActivity(repo: string, token: string): Promise<CommitDay[]> {
  const parsed = parseRepo(repo)
  if (!parsed) throw new GithubApiError(`"${repo}" doesn't look like "owner/repo".`)
  const url = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/stats/commit_activity`

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${token}`,
      },
    })
    if (res.status === 202) {
      await sleep(1600)
      continue
    }
    if (res.status === 404) {
      throw new GithubApiError(
        `Repository "${parsed.owner}/${parsed.repo}" not found (or the token can't see it).`,
      )
    }
    if (!res.ok) throw new GithubApiError(`GitHub API error ${res.status}`)
    const weeks = (await res.json()) as Array<{ week: number; days: number[] }>
    const out: CommitDay[] = []
    for (const w of weeks ?? []) {
      for (let d = 0; d < 7; d++) {
        const count = w.days?.[d] ?? 0
        if (count === 0) continue
        out.push({ day: new Date((w.week + d * 86400) * 1000).toISOString().slice(0, 10), count })
      }
    }
    return out
  }
  return []
}

export async function fetchCommits(
  repo: string,
  token: string,
  page = 1,
  perPage = 25,
  ref?: string,
): Promise<{ commits: GithubCommit[]; hasMore: boolean }> {
  const parsed = parseRepo(repo)
  if (!parsed) throw new GithubApiError(`"${repo}" doesn't look like "owner/repo".`)

  const params = new URLSearchParams({ per_page: String(perPage), page: String(page) })
  if (ref) params.set('sha', ref)

  const res = await ghFetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?${params}`,
    token,
    `Repository "${parsed.owner}/${parsed.repo}" not found (or the token can't see it).`,
  )

  const link = res.headers.get('link') ?? ''
  const hasMore = /rel="next"/.test(link)

  const data = (await res.json()) as Array<{
    sha: string
    html_url: string
    parents: { sha: string }[]
    commit: { message: string; author: { name: string; date: string } }
    author: { login: string; avatar_url: string } | null
  }>

  return {
    hasMore,
    commits: data.map((c) => ({
      sha: c.sha,
      parents: (c.parents ?? []).map((p) => p.sha),
      message: c.commit.message.split('\n')[0],
      authorName: c.commit.author?.name ?? 'Unknown',
      authorLogin: c.author?.login ?? null,
      authorAvatar: c.author?.avatar_url ?? null,
      date: c.commit.author?.date,
      url: c.html_url,
    })),
  }
}
