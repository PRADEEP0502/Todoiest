import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { fetchAttachment } from './src/server/attachmentProxy.js'
import { rewriteSpeech } from './src/server/rewrite.js'

/**
 * The `/api` endpoints during development. On Vercel each one runs as a function (see `api/`);
 * this serves the same handlers from the dev server so localhost behaves the same.
 */
function apiRoutes(): Plugin {
  const handlers: Record<string, (request: Request) => Promise<Response>> = {
    '/api/attachment': fetchAttachment,
    '/api/rewrite': rewriteSpeech,
  }
  return {
    name: 'api-routes',
    configureServer(server) {
      for (const [path, handler] of Object.entries(handlers)) {
        server.middlewares.use(path, (req, res) => {
          const chunks: Buffer[] = []
          req.on('data', (chunk: Buffer) => chunks.push(chunk))
          req.on('end', () => {
            const body = chunks.length ? Buffer.concat(chunks) : undefined
            const request = new Request(`http://localhost${req.url ?? ''}`, {
              method: req.method ?? 'GET',
              headers: {
                authorization: String(req.headers.authorization ?? ''),
                'content-type': String(req.headers['content-type'] ?? 'application/json'),
              },
              body: body && body.length ? new Uint8Array(body) : undefined,
            })
            handler(request)
              .then(async (response) => {
                res.statusCode = response.status
                response.headers.forEach((value, key) => res.setHeader(key, value))
                res.end(Buffer.from(await response.arrayBuffer()))
              })
              .catch(() => {
                res.statusCode = 502
                res.end('{"error":"The request could not be completed."}')
              })
          })
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiRoutes()],
})
