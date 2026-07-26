import { fileURLToPath, URL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * GitHub Pages serves project sites from /<repo>/. The deploy workflow sets
 * VITE_BASE from the repository name so this works without hardcoding it.
 * Locally (and on a custom domain) it stays at the root.
 */
const base = process.env.VITE_BASE ?? '/'

/** Re-runs the content build whenever a Markdown file or the topic registry changes. */
function contentWatcher(): Plugin {
  const script = fileURLToPath(new URL('./scripts/build-content.mjs', import.meta.url))
  const contentDir = fileURLToPath(new URL('./content', import.meta.url))

  return {
    name: 'content-watcher',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(contentDir)
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(contentDir)) return
        if (!/\.(md|ya?ml)$/i.test(file)) return

        const result = spawnSync(process.execPath, [script], { stdio: 'inherit' })
        if (result.status === 0) server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), contentWatcher()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
