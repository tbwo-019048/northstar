import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// vitest.config.ts doesn't set `test.globals: true` (kept explicit, matching
// how every test file imports describe/it/expect from 'vitest' rather than
// relying on injected globals) — so React Testing Library's usual automatic
// afterEach(cleanup) never registers on its own. Do it here instead.
afterEach(() => {
  cleanup()
})
