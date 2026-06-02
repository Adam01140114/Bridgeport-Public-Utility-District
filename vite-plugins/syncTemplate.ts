import { copyFileSync, existsSync, mkdirSync, watch } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const TEMPLATE_FILE = 'template.xlsx'

export function syncTemplatePlugin(): Plugin {
  const root = process.cwd()
  const source = path.join(root, TEMPLATE_FILE)
  const dest = path.join(root, 'public', TEMPLATE_FILE)

  const sync = () => {
    if (!existsSync(source)) {
      throw new Error(`Missing ${source}. Place ${TEMPLATE_FILE} at the project root.`)
    }
    mkdirSync(path.dirname(dest), { recursive: true })
    copyFileSync(source, dest)
  }

  return {
    name: 'sync-template',
    buildStart() {
      sync()
    },
    configureServer() {
      sync()
      watch(source, { persistent: true }, () => {
        sync()
      })
    },
  }
}
