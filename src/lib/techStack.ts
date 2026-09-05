export interface TechEntry {
  id: string
  name: string
  category: string
  iconUrl: string
}

const devicon = (path: string) => `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${path}`

/** Simple Icons for brands Devicon doesn't carry — forced to a neutral grey
 * (`71717a`) so the monochrome glyph stays visible in both light and dark. */
const simpleicon = (slug: string) => `https://cdn.simpleicons.org/${slug}/71717a`

/** A curated catalog for the Details "Tech Stack" grid — logos via Devicon
 * (jsdelivr CDN) or Simple Icons. Not exhaustive; add more entries here as
 * needed. */
export const TECH_CATALOG: TechEntry[] = [
  // Frontend frameworks
  { id: 'react', name: 'React', category: 'Frontend', iconUrl: devicon('react/react-original.svg') },
  { id: 'nextjs', name: 'Next.js', category: 'Frontend', iconUrl: devicon('nextjs/nextjs-original.svg') },
  { id: 'vue', name: 'Vue.js', category: 'Frontend', iconUrl: devicon('vuejs/vuejs-original.svg') },
  { id: 'nuxt', name: 'Nuxt', category: 'Frontend', iconUrl: devicon('nuxtjs/nuxtjs-original.svg') },
  { id: 'angular', name: 'Angular', category: 'Frontend', iconUrl: devicon('angular/angular-original.svg') },
  { id: 'svelte', name: 'Svelte', category: 'Frontend', iconUrl: devicon('svelte/svelte-original.svg') },
  { id: 'jquery', name: 'jQuery', category: 'Frontend', iconUrl: devicon('jquery/jquery-original.svg') },
  { id: 'redux', name: 'Redux', category: 'Frontend', iconUrl: devicon('redux/redux-original.svg') },
  { id: 'zustand', name: 'Zustand', category: 'Frontend', iconUrl: devicon('zustand/zustand-original.svg') },
  { id: 'reactrouter', name: 'React Router', category: 'Frontend', iconUrl: devicon('reactrouter/reactrouter-original.svg') },
  { id: 'framermotion', name: 'Framer Motion', category: 'Frontend', iconUrl: devicon('framermotion/framermotion-original.svg') },
  { id: 'threejs', name: 'Three.js', category: 'Frontend', iconUrl: devicon('threejs/threejs-original.svg') },
  { id: 'd3', name: 'D3.js', category: 'Frontend', iconUrl: devicon('d3js/d3js-original.svg') },
  { id: 'electron', name: 'Electron', category: 'Frontend', iconUrl: devicon('electron/electron-original.svg') },
  { id: 'tauri', name: 'Tauri', category: 'Frontend', iconUrl: devicon('tauri/tauri-original.svg') },
  { id: 'flutter', name: 'Flutter', category: 'Frontend', iconUrl: devicon('flutter/flutter-original.svg') },
  { id: 'leaflet', name: 'Leaflet', category: 'Frontend', iconUrl: simpleicon('leaflet') },
  { id: 'reacthookform', name: 'React Hook Form', category: 'Frontend', iconUrl: simpleicon('reacthookform') },
  { id: 'reactquery', name: 'TanStack Query', category: 'Frontend', iconUrl: simpleicon('reactquery') },
  {
    id: 'recharts',
    name: 'Recharts',
    category: 'Frontend',
    // No Devicon or Simple Icons entry — inline neutral bar-chart glyph.
    iconUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2371717a'%3E%3Crect x='3' y='12' width='4' height='9' rx='1'/%3E%3Crect x='10' y='7' width='4' height='14' rx='1'/%3E%3Crect x='17' y='3' width='4' height='18' rx='1'/%3E%3C/svg%3E",
  },

  // Styling / UI
  { id: 'tailwind', name: 'Tailwind CSS', category: 'Styling', iconUrl: devicon('tailwindcss/tailwindcss-original.svg') },
  { id: 'shadcn', name: 'shadcn/ui', category: 'Styling', iconUrl: simpleicon('shadcnui') },
  { id: 'radix', name: 'Radix UI', category: 'Styling', iconUrl: simpleicon('radixui') },
  { id: 'heroui', name: 'HeroUI', category: 'Styling', iconUrl: simpleicon('heroui') },
  { id: 'blueprint', name: 'BlueprintJS', category: 'Styling', iconUrl: simpleicon('blueprint') },
  { id: 'daisyui', name: 'DaisyUI', category: 'Styling', iconUrl: simpleicon('daisyui') },
  { id: 'bootstrap', name: 'Bootstrap', category: 'Styling', iconUrl: devicon('bootstrap/bootstrap-original.svg') },
  { id: 'sass', name: 'Sass', category: 'Styling', iconUrl: devicon('sass/sass-original.svg') },
  { id: 'html5', name: 'HTML5', category: 'Styling', iconUrl: devicon('html5/html5-original.svg') },
  { id: 'css3', name: 'CSS3', category: 'Styling', iconUrl: devicon('css3/css3-original.svg') },
  { id: 'figma', name: 'Figma', category: 'Styling', iconUrl: devicon('figma/figma-original.svg') },

  // Languages
  { id: 'typescript', name: 'TypeScript', category: 'Language', iconUrl: devicon('typescript/typescript-original.svg') },
  { id: 'javascript', name: 'JavaScript', category: 'Language', iconUrl: devicon('javascript/javascript-original.svg') },
  { id: 'python', name: 'Python', category: 'Language', iconUrl: devicon('python/python-original.svg') },
  { id: 'php', name: 'PHP', category: 'Language', iconUrl: devicon('php/php-original.svg') },
  { id: 'go', name: 'Go', category: 'Language', iconUrl: devicon('go/go-original.svg') },
  { id: 'rust', name: 'Rust', category: 'Language', iconUrl: devicon('rust/rust-original.svg') },
  { id: 'java', name: 'Java', category: 'Language', iconUrl: devicon('java/java-original.svg') },
  { id: 'csharp', name: 'C#', category: 'Language', iconUrl: devicon('csharp/csharp-original.svg') },
  { id: 'dotnet', name: '.NET', category: 'Language', iconUrl: devicon('dot-net/dot-net-original.svg') },
  { id: 'swift', name: 'Swift', category: 'Language', iconUrl: devicon('swift/swift-original.svg') },
  { id: 'kotlin', name: 'Kotlin', category: 'Language', iconUrl: devicon('kotlin/kotlin-original.svg') },

  // Backend / runtime
  { id: 'nodejs', name: 'Node.js', category: 'Backend', iconUrl: devicon('nodejs/nodejs-original.svg') },
  { id: 'deno', name: 'Deno', category: 'Backend', iconUrl: devicon('denojs/denojs-original.svg') },
  { id: 'bun', name: 'Bun', category: 'Backend', iconUrl: devicon('bun/bun-original.svg') },
  { id: 'express', name: 'Express', category: 'Backend', iconUrl: devicon('express/express-original.svg') },
  { id: 'django', name: 'Django', category: 'Backend', iconUrl: devicon('django/django-plain.svg') },
  { id: 'laravel', name: 'Laravel', category: 'Backend', iconUrl: devicon('laravel/laravel-original.svg') },
  { id: 'graphql', name: 'GraphQL', category: 'Backend', iconUrl: devicon('graphql/graphql-plain.svg') },
  { id: 'zod', name: 'Zod', category: 'Backend', iconUrl: simpleicon('zod') },
  { id: 'resend', name: 'Resend', category: 'Backend', iconUrl: simpleicon('resend') },

  // Data
  { id: 'supabase', name: 'Supabase', category: 'Data', iconUrl: devicon('supabase/supabase-original.svg') },
  { id: 'firebase', name: 'Firebase', category: 'Data', iconUrl: devicon('firebase/firebase-original.svg') },
  { id: 'postgresql', name: 'PostgreSQL', category: 'Data', iconUrl: devicon('postgresql/postgresql-original.svg') },
  { id: 'mysql', name: 'MySQL', category: 'Data', iconUrl: devicon('mysql/mysql-original.svg') },
  { id: 'mongodb', name: 'MongoDB', category: 'Data', iconUrl: devicon('mongodb/mongodb-original.svg') },
  { id: 'redis', name: 'Redis', category: 'Data', iconUrl: devicon('redis/redis-original.svg') },

  // DevOps / hosting / tooling
  { id: 'vite', name: 'Vite', category: 'Tooling', iconUrl: devicon('vitejs/vitejs-original.svg') },
  { id: 'webpack', name: 'Webpack', category: 'Tooling', iconUrl: devicon('webpack/webpack-original.svg') },
  { id: 'npm', name: 'npm', category: 'Tooling', iconUrl: devicon('npm/npm-original-wordmark.svg') },
  { id: 'yarn', name: 'Yarn', category: 'Tooling', iconUrl: devicon('yarn/yarn-original.svg') },
  { id: 'jest', name: 'Jest', category: 'Tooling', iconUrl: devicon('jest/jest-plain.svg') },
  { id: 'vitest', name: 'Vitest', category: 'Tooling', iconUrl: devicon('vitest/vitest-original.svg') },
  { id: 'playwright', name: 'Playwright', category: 'Tooling', iconUrl: devicon('playwright/playwright-original.svg') },
  {
    id: 'exceljs',
    name: 'ExcelJS / SheetJS',
    category: 'Tooling',
    // No brand icon available — inline neutral spreadsheet-grid glyph.
    iconUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M3 9h18M3 15h18M9 3v18M15 3v18'/%3E%3C/svg%3E",
  },
  { id: 'git', name: 'Git', category: 'Tooling', iconUrl: devicon('git/git-original.svg') },
  { id: 'github', name: 'GitHub', category: 'Tooling', iconUrl: devicon('github/github-original.svg') },
  { id: 'githubactions', name: 'GitHub Actions', category: 'Tooling', iconUrl: devicon('githubactions/githubactions-original.svg') },
  { id: 'docker', name: 'Docker', category: 'Tooling', iconUrl: devicon('docker/docker-original.svg') },
  { id: 'vercel', name: 'Vercel', category: 'Tooling', iconUrl: devicon('vercel/vercel-original.svg') },
  { id: 'netlify', name: 'Netlify', category: 'Tooling', iconUrl: devicon('netlify/netlify-original.svg') },
  { id: 'aws', name: 'AWS', category: 'Tooling', iconUrl: devicon('amazonwebservices/amazonwebservices-plain-wordmark.svg') },
  { id: 'nginx', name: 'Nginx', category: 'Tooling', iconUrl: devicon('nginx/nginx-original.svg') },
  { id: 'linux', name: 'Linux', category: 'Tooling', iconUrl: devicon('linux/linux-original.svg') },
]

export const TECH_BY_ID: Record<string, TechEntry> = Object.fromEntries(
  TECH_CATALOG.map((t) => [t.id, t]),
)

export const TECH_CATEGORIES = [...new Set(TECH_CATALOG.map((t) => t.category))]

const TECH_ID_BY_NAME: Record<string, string> = Object.fromEntries(
  TECH_CATALOG.map((t) => [t.name.toLowerCase(), t.id]),
)

/** Turn a free-text tech list (comma / semicolon / newline separated, as it
 * travels in the Excel Project sheet's `tech_stack` column) into known catalog
 * ids. Accepts either ids or display names, case-insensitive; anything not in
 * the catalog is dropped, since the picker can't show it anyway. */
export function resolveTechIds(raw: string): string[] {
  const out: string[] = []
  for (const token of raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)) {
    const id = TECH_BY_ID[token] ? token : TECH_ID_BY_NAME[token.toLowerCase()]
    if (id && !out.includes(id)) out.push(id)
  }
  return out
}

/** The inverse — catalog ids to their display names, for the Excel export. */
export function techNames(ids: string[]): string {
  return ids.map((id) => TECH_BY_ID[id]?.name ?? id).join(', ')
}
