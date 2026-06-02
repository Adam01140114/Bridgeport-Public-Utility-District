import { copyFileSync, createReadStream, existsSync, mkdirSync, watch } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const TEMPLATE_FILE = 'template.xlsx'
const TEMPLATE_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

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

  const isTemplateRequest = (url: string | undefined): boolean => {
    const pathname = url?.split('?')[0] ?? ''
    return pathname === `/${TEMPLATE_FILE}` || pathname.endsWith(`/${TEMPLATE_FILE}`)
  }

  return {
    name: 'sync-template',
    buildStart() {
      sync()
    },
    configureServer(server) {
      sync()
      watch(source, { persistent: true }, () => {
        sync()
      })

      // Dev: always stream repo-root template.xlsx (not a stale public/ copy).
      server.middlewares.use((req, res, next) => {
        if (!isTemplateRequest(req.url)) {
          next()
          return
        }
        if (!existsSync(source)) {
          res.statusCode = 404
          res.end('template.xlsx not found at project root')
          return
        }
        res.setHeader('Content-Type', TEMPLATE_MIME)
        res.setHeader('Cache-Control', 'no-store')
        createReadStream(source).pipe(res)
      })
    },
  }
}
