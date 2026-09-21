import type { Project } from '@/lib/types'
import type { TypeLayout } from '@/lib/projectLayout'
import { SummaryTab } from '@/pages/project/SummaryTab'
import { DetailsTab } from '@/pages/project/DetailsTab'

/** Simple Mode's "Summary" tab: Summary and Details rendered together in one
 * view instead of two separate tabs. Purely a display merge — each still
 * reads/writes its own underlying data via the same SummaryTab/DetailsTab
 * used everywhere else, and the type's own summary/details block config
 * still applies. */
export function SummaryDetailsMerged({ project, layout }: { project: Project; layout: TypeLayout }) {
  return (
    <div className="space-y-6">
      <SummaryTab project={project} blocks={layout.summary} />
      <div className="space-y-3 border-t border-border pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
        <DetailsTab project={project} blocks={layout.details} />
      </div>
    </div>
  )
}
