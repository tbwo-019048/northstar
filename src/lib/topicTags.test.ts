import { describe, expect, it } from 'vitest'
import { filterTopicsByTag, tagsForTopic, topicIdsForTag } from '@/lib/topicTags'
import type { Tag, TopicTag } from '@/lib/types'

const tag = (id: string, name: string): Tag => ({ id, name, environment: 'staging', created_at: '' })
const link = (topic_id: string, tag_id: string): TopicTag => ({ topic_id, tag_id, created_at: '' })

const tags: Tag[] = [tag('t1', 'Urgent'), tag('t2', 'Backend'), tag('t3', 'Design')]
const links: TopicTag[] = [
  link('topic-a', 't1'),
  link('topic-a', 't2'),
  link('topic-b', 't2'),
]

describe('tagsForTopic', () => {
  it('returns every tag assigned to a topic', () => {
    expect(tagsForTopic(tags, links, 'topic-a').map((t) => t.name).sort()).toEqual(['Backend', 'Urgent'])
  })

  it('returns an empty array for a topic with no tags', () => {
    expect(tagsForTopic(tags, links, 'topic-c')).toEqual([])
  })
})

describe('topicIdsForTag', () => {
  it('returns every topic id a tag is assigned to', () => {
    expect(topicIdsForTag(links, 't2').sort()).toEqual(['topic-a', 'topic-b'])
  })

  it('returns an empty array for an unused tag', () => {
    expect(topicIdsForTag(links, 't3')).toEqual([])
  })
})

describe('filterTopicsByTag', () => {
  const topics = [{ id: 'topic-a' }, { id: 'topic-b' }, { id: 'topic-c' }]

  it('returns every topic unchanged when no tag filter is set', () => {
    expect(filterTopicsByTag(topics, links, null)).toEqual(topics)
  })

  it('returns only topics assigned the given tag', () => {
    expect(filterTopicsByTag(topics, links, 't1')).toEqual([{ id: 'topic-a' }])
    expect(filterTopicsByTag(topics, links, 't2')).toEqual([{ id: 'topic-a' }, { id: 'topic-b' }])
  })

  it('returns an empty array when no topic has the given tag', () => {
    expect(filterTopicsByTag(topics, links, 't3')).toEqual([])
  })
})
