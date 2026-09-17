const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'DIV', 'SPAN', 'P'])

/** Strips everything except a small formatting allowlist and all attributes
 * (so no stray style/event-handler attributes survive from execCommand). Note
 * bodies are always self-authored in NoteEditor, so this is a defensive
 * nicety rather than a hard security boundary. */
export function sanitizeNoteHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walk = (node: Element) => {
    ;[...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name))
    ;[...node.children].forEach((child) => {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...child.childNodes)
      } else {
        walk(child)
      }
    })
  }
  walk(doc.body)
  return doc.body.innerHTML
}
