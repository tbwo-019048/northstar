// Generates the browser / PWA icon set from public/icon.png.
//
// icon.png is a navy compass rose sitting on a baked-in checkerboard (there is
// no real alpha channel). This luminance-keys the dark compass out of the light
// checker to recover a clean transparent master, then emits every size the
// tab / home-screen / Vercel need.
//
// Not wired into `build` — sharp is a native module. Run it by hand after
// changing icon.png and commit the results:
//
//   npm run build-icons
//
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')

// Luminance below LO is fully opaque (compass); above HI fully transparent
// (checker); linear feather between.
const LO = 60
const HI = 100

async function keyedMaster() {
  const src = sharp(join(pub, 'icon.png')).resize(768, 768, { fit: 'contain', background: '#ffffff' })
  const { data, info } = await src.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const out = Buffer.from(data)
  for (let i = 0; i < width * height; i++) {
    const p = i * channels
    const lum = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]
    let a = 255
    if (lum >= HI) a = 0
    else if (lum > LO) a = Math.round((1 - (lum - LO) / (HI - LO)) * 255)
    out[p + 3] = a
  }
  // Trim the transparent margin, then re-pad to a square with a small gutter.
  const trimmed = await sharp(out, { raw: { width, height, channels } })
    .png()
    .trim({ threshold: 1 })
    .toBuffer()
  const meta = await sharp(trimmed).metadata()
  const side = Math.max(meta.width ?? 1, meta.height ?? 1)
  const pad = Math.round(side * 0.06)
  return sharp({
    create: {
      width: side + pad * 2,
      height: side + pad * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, gravity: 'center' }])
    .png()
    .toBuffer()
}

async function main() {
  const master = await keyedMaster()

  const png = (size, opts = {}) =>
    sharp(master).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, ...opts }).png()

  // Plain transparent favicons.
  for (const size of [16, 32, 96]) {
    await png(size).toFile(join(pub, `favicon-${size}.png`))
  }

  // Apple ignores alpha — flatten onto white.
  await sharp(master)
    .resize(180, 180, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(join(pub, 'apple-touch-icon.png'))

  // Maskable PWA icons — extra transparent padding so the safe zone clears.
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.78)
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: await sharp(master).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), gravity: 'center' }])
      .png()
      .toFile(join(pub, `icon-${size}.png`))
  }

  // favicon.ico bundles 16/32/48.
  const icoSizes = await Promise.all(
    [16, 32, 48].map((s) => sharp(master).resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()),
  )
  await writeFile(join(pub, 'favicon.ico'), await pngToIco(icoSizes))

  await writeFile(
    join(pub, 'site.webmanifest'),
    JSON.stringify(
      {
        name: 'NorthStar',
        short_name: 'NorthStar',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        theme_color: '#0f1d30',
        background_color: '#0b1220',
        display: 'standalone',
      },
      null,
      2,
    ) + '\n',
  )

  // Touch icon.png is left as the user supplied it (referenced by nothing now).
  await readFile(join(pub, 'favicon.ico')) // sanity read
  console.log('build-icons: wrote favicon.ico, favicon-16/32/96.png, apple-touch-icon.png, icon-192/512.png, site.webmanifest')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
