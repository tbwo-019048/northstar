import type { Topic } from '@/lib/types'

/** Body is stored as sanitized HTML (same editor as Notes) — strip tags
 * before matching so search looks at the actual text, not markup. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Whether a topic's title or body text contains `query` (case-insensitive,
 * whitespace-trimmed). An empty query matches everything. */
export function matchesTopicSearch(topic: Pick<Topic, 'title' | 'body'>, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (topic.title.toLowerCase().includes(q)) return true
  return stripHtml(topic.body).toLowerCase().includes(q)
}

/** Filters a list of topics down to those matching the search query. */
export function searchTopics<T extends Pick<Topic, 'title' | 'body'>>(topics: T[], query: string): T[] {
  if (!query.trim()) return topics
  return topics.filter((t) => matchesTopicSearch(t, query))
}
