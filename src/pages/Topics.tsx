import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { EditableText, IconButton, Input } from '@/components/ui-lite'
import { NoteEditor } from '@/components/NoteEditor'
import { TopicChecklist } from '@/components/TopicChecklist'
import { cn } from '@/lib/utils'
import { searchTopics } from '@/lib/topicSearch'
import { filterTopicsByTag } from '@/lib/topicTags'
import type { Topic } from '@/lib/types'
import { useTopics } from '@/store/useTopics'
import { useTags } from '@/store/useTags'
import { useConfirm } from '@/store/useConfirm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'

// Topics is Notes cloned and rebranded (see src/pages/Notes.tsx, the
// template) with two additions on top: search and tags. Notes itself is
// untouched — this is a separate page/route/store/table.

export function Topics() {
  const { topics, loaded, load, subscribe, create, update, remove } = useTopics()
  const {
    tags,
    links: tagLinks,
    loaded: tagsLoaded,
    load: loadTags,
    subscribe: subscribeTags,
    createTag,
    assignTag,
    unassignTag,
    tagsForTopic,
  } = useTags()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const confirm = useConfirm()

  useEffect(() => {
    if (!loaded) void load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    if (!tagsLoaded) void loadTags()
    return subscribeTags()
  }, [tagsLoaded, loadTags, subscribeTags])

  const filtered = useMemo(
    () => filterTopicsByTag(searchTopics(topics, query), tagLinks, tagFilter),
    [topics, query, tagFilter, tagLinks],
  )

  useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id)
    if (selectedId && !filtered.some((t) => t.id === selectedId)) setSelectedId(filtered[0]?.id ?? null)
  }, [filtered, selectedId])

  const selected = topics.find((t) => t.id === selectedId) ?? null

  const handleCreate = async () => {
    const topic = await create()
    if (topic) setSelectedId(topic.id)
  }

  const handleDelete = async (topic: Topic) => {
    if (await confirm({ title: `Delete "${topic.title || 'Untitled topic'}"?`, tone: 'danger' })) {
      remove(topic.id)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-sm font-semibold">Topics</h1>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-2 md:w-64">
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted/40 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <Plus size={15} /> New topic
          </button>

          <label className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5">
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics…"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </label>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px]',
                  !tagFilter ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/70',
                )}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setTagFilter((current) => (current === tag.id ? null : tag.id))}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px]',
                    tagFilter === tag.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          <ul className="flex flex-col gap-0.5">
            {filtered.map((topic) => (
              <li key={topic.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(topic.id)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    topic.id === selectedId ? 'bg-muted font-medium' : 'hover:bg-muted/60',
                  )}
                >
                  <span className="truncate">{topic.title || 'Untitled topic'}</span>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDelete(topic)
                    }}
                    aria-label={`Delete ${topic.title || 'topic'}`}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </button>
              </li>
            ))}
            {loaded && filtered.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                {topics.length === 0 ? 'No topics yet.' : 'No topics match.'}
              </li>
            )}
          </ul>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {selected ? (
            <>
              <EditableText
                key={selected.id}
                value={selected.title}
                onSave={(title) => update(selected.id, { title })}
                placeholder="Untitled topic"
                className="text-lg font-semibold"
              />
              <TopicTags
                topicId={selected.id}
                assigned={tagsForTopic(selected.id)}
                allTags={tags}
                onCreateTag={createTag}
                onAssign={assignTag}
                onUnassign={unassignTag}
              />
              <NoteEditor key={selected.id} value={selected.body} onSave={(body) => update(selected.id, { body })} />
              <div>
                <h2 className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">Checklists</h2>
                <TopicChecklist topicId={selected.id} sections={selected.checklist_sections} />
              </div>
            </>
          ) : (
            <div className="grid h-40 place-items-center text-sm text-muted-foreground">
              {topics.length ? 'Select a topic' : 'Create a topic to get started.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Tag chips for the selected topic + a picker dialog to assign more or
 * create a new one — same chips+Add-button+picker-dialog pattern as
 * SummaryTab's ClientsSection. */
function TopicTags({
  topicId,
  assigned,
  allTags,
  onCreateTag,
  onAssign,
  onUnassign,
}: {
  topicId: string
  assigned: { id: string; name: string }[]
  allTags: { id: string; name: string }[]
  onCreateTag: (name: string) => Promise<{ id: string; name: string } | null>
  onAssign: (topicId: string, tagId: string) => void
  onUnassign: (topicId: string, tagId: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const createAndAssign = async () => {
    const tag = await onCreateTag(newTagName)
    setNewTagName('')
    if (tag) onAssign(topicId, tag.id)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assigned.map((tag) => (
        <span key={tag.id} className="group/chip inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
          {tag.name}
          <button
            type="button"
            onClick={() => onUnassign(topicId, tag.id)}
            className="opacity-0 hover:text-destructive group-hover/chip:opacity-100"
            aria-label={`Remove tag ${tag.name}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
      >
        <Plus size={12} /> Tag
      </button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        {pickerOpen && (
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Assign a tag</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 space-y-0.5 overflow-y-auto">
              {allTags.map((tag) => {
                const active = assigned.some((t) => t.id === tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => (active ? onUnassign(topicId, tag.id) : onAssign(topicId, tag.id))}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                      active ? 'bg-primary/10 text-foreground' : 'hover:bg-muted',
                    )}
                  >
                    {tag.name}
                    {active && <span className="text-xs text-primary">Assigned</span>}
                  </button>
                )
              })}
              {allTags.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No tags yet — create one below.</p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void createAndAssign()
              }}
              className="flex items-center gap-1.5 border-t border-border pt-2"
            >
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name…"
              />
              <button className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                Create
              </button>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
