import type { Tag, TopicTag } from '@/lib/types'

/** Every tag assigned to a topic, via the topic_tags join rows. */
export function tagsForTopic(tags: Tag[], links: TopicTag[], topicId: string): Tag[] {
  const tagIds = new Set(links.filter((l) => l.topic_id === topicId).map((l) => l.tag_id))
  return tags.filter((t) => tagIds.has(t.id))
}

/** Every topic id a given tag is assigned to. */
export function topicIdsForTag(links: TopicTag[], tagId: string): string[] {
  return links.filter((l) => l.tag_id === tagId).map((l) => l.topic_id)
}

/** Filters a list of topics down to those assigned the given tag. `null`
 * (no filter) returns the list unchanged. */
export function filterTopicsByTag<T extends { id: string }>(
  topics: T[],
  links: TopicTag[],
  tagId: string | null,
): T[] {
  if (!tagId) return topics
  const ids = new Set(topicIdsForTag(links, tagId))
  return topics.filter((t) => ids.has(t.id))
}
