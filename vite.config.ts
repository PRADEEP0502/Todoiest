import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { fetchAttachment } from './src/server/attachmentProxy.js'

/**
 * `/api/attachment` in development. On Vercel the same handler runs as a function (see
 * `api/attachment.ts`); this serves it from the dev server so previews work on localhost too.
 */
function attachmentProxy(): Plugin {
  return {
    name: 'attachment-proxy',
    configureServer(server) {
      server.middlewares.use('/api/attachment', (req, res) => {
        const request = new Request(`http://localhost${req.url ?? ''}`, {
          headers: { authorization: String(req.headers.authorization ?? '') },
        })
        fetchAttachment(request)
          .then(async (response) => {
            res.statusCode = response.status
            response.headers.forEach((value, key) => res.setHeader(key, value))
            res.end(Buffer.from(await response.arrayBuffer()))
          })
          .catch(() => {
            res.statusCode = 502
            res.end('{"error":"Todoist could not be reached for this file."}')
          })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), attachmentProxy()],
})
