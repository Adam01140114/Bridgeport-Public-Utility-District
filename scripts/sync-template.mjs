import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'template.xlsx')
const dest = path.join(root, 'public', 'template.xlsx')

if (!existsSync(source)) {
  console.error(`Missing ${source} — add template.xlsx at the repo root.`)
  process.exit(1)
}

mkdirSync(path.dirname(dest), { recursive: true })
copyFileSync(source, dest)
