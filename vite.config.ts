import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** GitHub project pages are served under /repo-name/; GITHUB_REPOSITORY is set in Actions. */
function basePath(): string {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  return repo ? `/${repo}/` : '/'
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: basePath(),
  server: {
    host: true, // listen on 0.0.0.0 so phones on the same Wi‑Fi can connect
  },
})
