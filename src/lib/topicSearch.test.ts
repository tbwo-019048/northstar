import { describe, expect, it } from 'vitest'
import { matchesTopicSearch, searchTopics, stripHtml } from '@/lib/topicSearch'

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  it('unescapes &nbsp;', () => {
    expect(stripHtml('A&nbsp;B')).toBe('A B')
  })
})

describe('matchesTopicSearch', () => {
  const topic = { title: 'Q4 Roadmap', body: '<p>Ship the <b>billing</b> rewrite</p>' }

  it('matches on title, case-insensitively', () => {
    expect(matchesTopicSearch(topic, 'roadmap')).toBe(true)
    expect(matchesTopicSearch(topic, 'ROADMAP')).toBe(true)
  })

  it('matches on body text with HTML tags stripped', () => {
    expect(matchesTopicSearch(topic, 'billing')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matchesTopicSearch(topic, 'invoicing')).toBe(false)
  })

  it('treats an empty/whitespace query as matching everything', () => {
    expect(matchesTopicSearch(topic, '')).toBe(true)
    expect(matchesTopicSearch(topic, '   ')).toBe(true)
  })

  it('does not match against HTML markup itself', () => {
    expect(matchesTopicSearch(topic, '<b>')).toBe(false)
  })
})

describe('searchTopics', () => {
  const topics = [
    { title: 'Q4 Roadmap', body: '<p>Ship billing rewrite</p>' },
    { title: 'Onboarding notes', body: '<p>New hire checklist</p>' },
    { title: 'Billing FAQ', body: '<p>Common questions</p>' },
  ]

  it('returns every topic for an empty query', () => {
    expect(searchTopics(topics, '')).toEqual(topics)
  })

  it('returns only topics whose title or body match', () => {
    const result = searchTopics(topics, 'billing')
    expect(result.map((t) => t.title)).toEqual(['Q4 Roadmap', 'Billing FAQ'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(searchTopics(topics, 'nonexistent-term')).toEqual([])
  })
})
