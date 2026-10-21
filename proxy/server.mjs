// Standalone proxy+static server for production use:
//   node server.mjs [port]
// Serves dist/ (built app) and mounts the proxy at /xenu-proxy.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { handleProxy } from './core.mjs'

const PORT = Number(process.argv[2] || process.env.PORT || 8080)
const DIST = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.map': 'application/json',
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`)
    if (u.pathname === '/xenu-proxy') return await handleProxy(req, res)

    // static files with SPA fallback to index.html
    let p = normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, '')
    if (p === '/' || p === '\\') p = '/index.html'
    const file = join(DIST, p)
    try {
      const data = await readFile(file)
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
      res.end(data)
    } catch {
      const index = await readFile(join(DIST, 'index.html'))
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(index)
    }
  } catch (err) {
    res.writeHead(500)
    res.end('server error: ' + err.message)
  }
})

server.listen(PORT, () => console.log(`xenu-web (proxy+static) on http://localhost:${PORT}`))
