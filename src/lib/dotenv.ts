/** Minimal .env parser — KEY=VALUE per line, '#' comments, blank lines
 * skipped, quoted values (single or double) unwrapped, `export KEY=` allowed. */
export function parseDotEnv(text: string): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const withoutExport = line.replace(/^export\s+/, '')
    const eq = withoutExport.indexOf('=')
    if (eq === -1) continue
    const key = withoutExport.slice(0, eq).trim()
    if (!key) continue
    let value = withoutExport.slice(eq + 1).trim()
    const quoted = value.match(/^"(.*)"$/) ?? value.match(/^'(.*)'$/)
    if (quoted) {
      value = quoted[1]
    } else {
      // Strip an inline, unquoted trailing comment.
      const hashIdx = value.indexOf(' #')
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim()
    }
    out.push({ key, value })
  }
  return out
}

export function serializeDotEnv(vars: { key: string; value: string }[]): string {
  return vars.map(({ key, value }) => `${key}=${/\s|#/.test(value) ? `"${value}"` : value}`).join('\n') + '\n'
}
