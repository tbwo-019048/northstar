import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Project } from '@/lib/types'
import type { TypeLayout } from '@/lib/projectLayout'

// SummaryTab/DetailsTab are heavy components (their own stores, dialogs,
// screenshot galleries, etc.) — mock them to lightweight stand-ins so this
// test stays focused on what SummaryDetailsMerged itself is responsible
// for: rendering both, with the right blocks, under a "Details" heading.
vi.mock('@/pages/project/SummaryTab', () => ({
  SummaryTab: ({ blocks }: { blocks: string[] }) => (
    <div data-testid="summary-tab">Summary:{blocks.join(',')}</div>
  ),
}))
vi.mock('@/pages/project/DetailsTab', () => ({
  DetailsTab: ({ blocks }: { blocks: string[] }) => (
    <div data-testid="details-tab">Details:{blocks.join(',')}</div>
  ),
}))

const { SummaryDetailsMerged } = await import('@/pages/project/SummaryDetailsMerged')
const { SummaryTab } = await import('@/pages/project/SummaryTab')

const project = { id: 'p1', name: 'Project' } as Project
const layout: TypeLayout = {
  hiddenTabs: [],
  tabLabels: {},
  summary: ['progress', 'summary'],
  details: ['codename', 'state'],
  simpleUsers: false,
}

describe('SummaryDetailsMerged (Simple Mode ON)', () => {
  it('renders both Summary and Details in one view', () => {
    render(<SummaryDetailsMerged project={project} layout={layout} />)

    expect(screen.getByTestId('summary-tab')).toBeInTheDocument()
    expect(screen.getByTestId('details-tab')).toBeInTheDocument()
  })

  it('passes each tab its own blocks from the layout', () => {
    render(<SummaryDetailsMerged project={project} layout={layout} />)

    expect(screen.getByTestId('summary-tab')).toHaveTextContent('Summary:progress,summary')
    expect(screen.getByTestId('details-tab')).toHaveTextContent('Details:codename,state')
  })

  it('labels the Details section so it reads as merged, not two disconnected tabs', () => {
    render(<SummaryDetailsMerged project={project} layout={layout} />)

    expect(screen.getByText('Details')).toBeInTheDocument()
  })
})

describe('Standard view (Simple Mode OFF)', () => {
  it('SummaryTab alone renders no Details content', () => {
    render(<SummaryTab project={project} blocks={layout.summary} />)

    expect(screen.getByTestId('summary-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('details-tab')).not.toBeInTheDocument()
  })
})
