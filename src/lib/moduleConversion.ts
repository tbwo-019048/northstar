import { useProjectData } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { layoutFor } from '@/lib/projectLayout'
import type { Attachment, PipelineItem, PlanItem, Priority, Project, RequestItem, Todo } from '@/lib/types'

export type ActiveModule = 'pipeline' | 'todo' | 'planning' | 'requests'

export const ACTIVE_MODULE_LABEL: Record<ActiveModule, string> = {
  pipeline: 'Pipeline',
  todo: 'To-Do',
  planning: 'Planning',
  requests: 'Requests',
}

const PRIORITY_TO_NUM: Record<Priority, number> = { urgent: 10, high: 8, medium: 5, low: 2 }
const numToPriority = (n: number): Priority => (n >= 9 ? 'urgent' : n >= 6 ? 'high' : n >= 3 ? 'medium' : 'low')

function attachmentLines(attachments: Attachment[]): string {
  return attachments.length ? `\n\nAttachments:\n${attachments.map((a) => `- ${a.name}: ${a.url}`).join('\n')}` : ''
}

/** Finds this project's active pipeline, creating one if none exists yet.
 * Shared by TodoTab's manual "send to pipeline" action and the module
 * conversion below, so there's exactly one place that decides what "the"
 * pipeline for a project means. */
export async function ensureActivePipeline(projectId: string): Promise<string | null> {
  const { rows, add } = useProjectData.getState()
  const existing = rows.pipelines.find((p) => p.status === 'active') ?? rows.pipelines[0]
  if (existing) return existing.id
  const created = await add('pipelines', {
    project_id: projectId,
    name: 'Pipeline 1',
    status: 'active',
    sort: 0,
  })
  return (created as { id: string } | null)?.id ?? null
}

/** Moves every item currently in the other three governed modules
 * (Pipeline/To-Do/Planning/Requests) into `to`, mapping fields best-effort —
 * see the field-mapping table in the implementation plan for the full
 * rationale per pair. This is a MOVE: source rows are deleted once their
 * mapped counterpart is created, so switching back later can't resurrect
 * duplicates. Only pipelines with status 'active' are swept; archived/
 * completed pipelines are left alone as historical record. */
export async function convertActiveModule(project: Project, to: ActiveModule) {
  const { rows, add, del } = useProjectData.getState()
  const variant = layoutFor(project.type).planningVariant ?? 'full'
  const planningStatus = (done: boolean) =>
    variant === 'simple'
      ? { status: done ? 'completed' : 'requested', simple_status: done ? 'completed' : 'pending' }
      : { status: done ? 'completed' : 'requested', simple_status: null }

  const activePipelineIds = new Set(rows.pipelines.filter((p) => p.status === 'active').map((p) => p.id))
  const pipelineItems = rows.pipeline_items.filter((i) => activePipelineIds.has(i.pipeline_id as string)) as unknown as PipelineItem[]
  const todos = rows.todos as unknown as Todo[]
  const planItems = rows.plan_items as unknown as PlanItem[]
  const requests = rows.requests as unknown as RequestItem[]

  let pipelineSort = rows.pipeline_items.length
  let todoSort = rows.todos.length
  let planSort = rows.plan_items.length
  let requestSort = rows.requests.length

  if (to !== 'pipeline') {
    for (const item of pipelineItems) {
      const estimateNote = item.estimate_hours ? `Estimated ${item.estimate_hours}h.` : ''
      if (to === 'todo') {
        await add('todos', {
          project_id: project.id,
          title: item.body,
          subtitle: '',
          type: 'feature',
          priority: 'medium',
          status: item.done ? 'completed' : 'todo',
          description: estimateNote,
          attachments: [],
          sort: todoSort++,
        })
      } else if (to === 'planning') {
        await add('plan_items', {
          project_id: project.id,
          title: item.body,
          description: estimateNote,
          priority: 5,
          start_date: null,
          due_date: null,
          photos: [],
          sort: planSort++,
          ...planningStatus(item.done),
        })
      } else if (to === 'requests') {
        await add('requests', {
          project_id: project.id,
          title: item.body,
          subtitle: '',
          requested_by: '',
          priority: 'medium',
          status: item.done ? 'completed' : 'todo',
          notes: estimateNote,
          sort: requestSort++,
        })
      }
      await del('pipeline_items', item.id)
    }
  }

  if (to !== 'todo') {
    for (const todo of todos) {
      if (to === 'pipeline') {
        const pipelineId = await ensureActivePipeline(project.id)
        if (pipelineId) {
          await add('pipeline_items', {
            pipeline_id: pipelineId,
            body: todo.subtitle ? `${todo.title} — ${todo.subtitle}` : todo.title,
            done: todo.status === 'completed',
            source_todo_id: todo.id,
            sort: pipelineSort++,
          })
        }
      } else if (to === 'planning') {
        const description = (todo.subtitle ? `${todo.subtitle}\n\n` : '') + todo.description + attachmentLines(todo.attachments)
        await add('plan_items', {
          project_id: project.id,
          title: todo.title,
          description,
          priority: PRIORITY_TO_NUM[todo.priority],
          start_date: null,
          due_date: null,
          photos: [],
          sort: planSort++,
          ...planningStatus(todo.status === 'completed'),
        })
      } else if (to === 'requests') {
        await add('requests', {
          project_id: project.id,
          title: todo.title,
          subtitle: todo.subtitle,
          requested_by: '',
          priority: todo.priority,
          status: todo.status,
          notes: todo.description + attachmentLines(todo.attachments),
          sort: requestSort++,
        })
      }
      await del('todos', todo.id)
    }
  }

  if (to !== 'planning') {
    for (const item of planItems) {
      const dateLines = [item.start_date ? `Start: ${item.start_date}` : '', item.due_date ? `Due: ${item.due_date}` : '']
        .filter(Boolean)
        .join('\n')
      const photoLines = item.photos.length ? `\n${item.photos.map((p) => p.url).join('\n')}` : ''
      const done = item.status === 'completed' || item.status === 'failed'
      if (to === 'pipeline') {
        const pipelineId = await ensureActivePipeline(project.id)
        if (pipelineId) {
          await add('pipeline_items', {
            pipeline_id: pipelineId,
            body: item.description ? `${item.title} (${item.description.slice(0, 80)})` : item.title,
            done,
            sort: pipelineSort++,
          })
        }
      } else if (to === 'todo') {
        await add('todos', {
          project_id: project.id,
          title: item.title,
          subtitle: '',
          type: 'feature',
          priority: numToPriority(item.priority),
          status: item.status === 'completed' ? 'completed' : 'todo',
          description: [item.description, dateLines].filter(Boolean).join('\n\n'),
          attachments: item.photos.map((p) => ({ name: p.caption ?? 'Photo', url: p.url })),
          sort: todoSort++,
        })
      } else if (to === 'requests') {
        await add('requests', {
          project_id: project.id,
          title: item.title,
          subtitle: '',
          requested_by: '',
          priority: numToPriority(item.priority),
          status: item.status === 'completed' ? 'completed' : 'todo',
          notes: [item.description, dateLines].filter(Boolean).join('\n\n') + photoLines,
          sort: requestSort++,
        })
      }
      await del('plan_items', item.id)
    }
  }

  if (to !== 'requests') {
    for (const req of requests) {
      const requestedByNote = req.requested_by ? `Requested by: ${req.requested_by}\n\n` : ''
      if (to === 'pipeline') {
        const pipelineId = await ensureActivePipeline(project.id)
        if (pipelineId) {
          await add('pipeline_items', {
            pipeline_id: pipelineId,
            body: req.requested_by ? `[from ${req.requested_by}] ${req.title}` : req.title,
            done: req.status === 'completed',
            sort: pipelineSort++,
          })
        }
      } else if (to === 'todo') {
        await add('todos', {
          project_id: project.id,
          title: req.title,
          subtitle: req.subtitle,
          type: 'feature',
          priority: req.priority,
          status: req.status,
          description: requestedByNote + req.notes,
          attachments: [],
          sort: todoSort++,
        })
      } else if (to === 'planning') {
        await add('plan_items', {
          project_id: project.id,
          title: req.title,
          description: requestedByNote + req.notes,
          priority: PRIORITY_TO_NUM[req.priority],
          start_date: null,
          due_date: null,
          photos: [],
          sort: planSort++,
          ...planningStatus(req.status === 'completed'),
        })
      }
      await del('requests', req.id)
    }
  }

  await useProjects.getState().update(project.id, { active_module: to })
}
