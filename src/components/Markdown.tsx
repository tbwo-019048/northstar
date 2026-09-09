import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Small dependency-free markdown renderer — renders to real React nodes (no
 * dangerouslySetInnerHTML). Supports headings, paragraphs, bold/italic/code,
 * links, unordered/ordered lists, blockquotes, fenced code blocks and rules.
 * Deliberately not a full CommonMark implementation — enough for an infosheet.
 */

type Keygen = () => string
const makeKeygen = (): Keygen => {
  let n = 0
  return () => `md${n++}`
}

const INLINE_SRC =
  '(`[^`]+`)|(\\*\\*[^*]+\\*\\*|__[^_]+__)|(\\*[^*\\s][^*]*\\*|_[^_\\s][^_]*_)|(\\[[^\\]]+\\]\\([^)\\s]+\\))'

function renderInline(src: string, key: Keygen): ReactNode[] {
  const out: ReactNode[] = []
  const re = new RegExp(INLINE_SRC, 'g') // fresh per call — renderInline recurses
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('`')) {
      out.push(
        <code key={key()} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push(<strong key={key()}>{renderInline(tok.slice(2, -2), key)}</strong>)
    } else if (tok.startsWith('[')) {
      const lm = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok)
      if (lm) {
        out.push(
          <a
            key={key()}
            href={lm[2]}
            target="_blank"
            rel="noreferrer"
            className="text-link underline"
          >
            {lm[1]}
          </a>,
        )
      } else out.push(tok)
    } else {
      out.push(<em key={key()}>{renderInline(tok.slice(1, -1), key)}</em>)
    }
    last = m.index + tok.length
  }
  if (last < src.length) out.push(src.slice(last))
  return out
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-lg font-semibold',
  2: 'text-base font-semibold',
  3: 'text-sm font-semibold',
  4: 'text-sm font-semibold text-muted-foreground',
  5: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  6: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
}

const SPECIAL = /^(#{1,6}\s|>\s?|```|\d+[.)]\s|[-*+]\s|([-*_])\2{2,}\s*$)/

function parseBlocks(src: string, key: Keygen): ReactNode[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (/^```/.test(line)) {
      const body: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++])
      if (i < lines.length) i++
      blocks.push(
        <pre
          key={key()}
          className="overflow-x-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-xs"
        >
          <code>{body.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const content = renderInline(heading[2], key)
      const cls = HEADING_CLASS[level]
      blocks.push(
        level <= 1 ? (
          <h3 key={key()} className={cls}>{content}</h3>
        ) : level === 2 ? (
          <h4 key={key()} className={cls}>{content}</h4>
        ) : (
          <h5 key={key()} className={cls}>{content}</h5>
        ),
      )
      i++
      continue
    }

    if (/^([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={key()} className="border-border" />)
      i++
      continue
    }

    if (/^>\s?/.test(line)) {
      const body: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(
        <blockquote key={key()} className="border-l-2 border-border pl-3 text-muted-foreground">
          {parseBlocks(body.join('\n'), key)}
        </blockquote>,
      )
      continue
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i++].replace(/^\d+[.)]\s+/, ''))
      }
      blocks.push(
        <ol key={key()} className="list-decimal space-y-0.5 pl-5">
          {items.map((it) => (
            <li key={key()}>{renderInline(it, key)}</li>
          ))}
        </ol>,
      )
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i++].replace(/^[-*+]\s+/, ''))
      }
      blocks.push(
        <ul key={key()} className="list-disc space-y-0.5 pl-5">
          {items.map((it) => (
            <li key={key()}>{renderInline(it, key)}</li>
          ))}
        </ul>,
      )
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !SPECIAL.test(lines[i])) {
      para.push(lines[i++])
    }
    blocks.push(
      <p key={key()}>
        {para.map((l, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInline(l, key)}
          </Fragment>
        ))}
      </p>,
    )
  }

  return blocks
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  if (!children.trim()) return null
  return (
    <div className={cn('space-y-2 text-sm leading-relaxed', className)}>
      {parseBlocks(children, makeKeygen())}
    </div>
  )
}
