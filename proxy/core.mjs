// Xenu proxy core — same-origin endpoint that performs real HTTP fetches
// server-side so the browser crawler is not blocked by CORS.
// Used by: vite plugin (dev) and server.mjs (production).
//
// Env: XENU_PER_HOST (default 6), XENU_TIMEOUT_MS (default 65000),
//      XENU_UA (default: current Chrome UA), XENU_ALLOW_PRIVATE (default 1)

const PER_HOST = Number(process.env.XENU_PER_HOST || 6)
const TIMEOUT_MS = Number(process.env.XENU_TIMEOUT_MS || 65000)
const MAX_BODY = 8 * 1024 * 1024
const UA =
  process.env.XENU_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// ---- per-host semaphore (be polite: ≤ N concurrent requests per host) ----
const hosts = new Map()

async function acquireSlot(host) {
  let h = hosts.get(host)
  if (!h) {
    h = { count: 0, queue: [] }
    hosts.set(host, h)
  }
  if (h.count < PER_HOST) {
    h.count++
    return
  }
  await new Promise((resolve) => h.queue.push(resolve))
  h.count++
}

function releaseSlot(host) {
  const h = hosts.get(host)
  if (!h) return
  h.count = Math.max(0, h.count - 1)
  const next = h.queue.shift()
  if (next) next()
}

const PASS_HEADERS = ['content-type', 'content-length', 'last-modified', 'server', 'location']

export async function handleProxy(req, res) {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }

  // connect (vite) strips the mount prefix; req.url is "?ping=1" or "?url=..."
  const u = new URL(req.url, 'http://local')

  if (u.searchParams.get('ping')) {
    res.writeHead(200, { ...cors, 'content-type': 'text/plain' })
    res.end('pong')
    return
  }

  const target = u.searchParams.get('url')
  if (!target) {
    res.writeHead(400, { ...cors, 'content-type': 'text/plain' })
    res.end('missing ?url=')
    return
  }

  let parsed
  try {
    parsed = new URL(target)
  } catch {
    res.writeHead(400, { ...cors, 'content-type': 'text/plain' })
    res.end('invalid url')
    return
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    res.writeHead(400, { ...cors, 'content-type': 'text/plain' })
    res.end('only http/https')
    return
  }
  if (process.env.XENU_ALLOW_PRIVATE !== '0' && isPrivateHost(parsed.hostname)) {
    res.writeHead(403, { ...cors, 'x-xenu-error': 'private host blocked (XENU_ALLOW_PRIVATE=0)', 'content-type': 'text/plain' })
    res.end('blocked')
    return
  }

  const method = (u.searchParams.get('method') || 'GET').toUpperCase()
  if (!['GET', 'HEAD'].includes(method)) {
    res.writeHead(405, { ...cors, 'content-type': 'text/plain' })
    res.end('only GET/HEAD')
    return
  }

  await acquireSlot(parsed.hostname)
  try {
    const upstream = await fetch(target, {
      method,
      redirect: 'manual', // pass 3xx + Location through; the crawler tracks redirects like Xenu
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent': UA,
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
      },
    })

    const out = { ...cors }
    for (const h of PASS_HEADERS) {
      const v = upstream.headers.get(h)
      if (v) out[h] = v
    }
    if (upstream.headers.get('cf-mitigated')) out['x-xenu-waf'] = '1'

    let body
    if (method !== 'HEAD' && upstream.status >= 200 && upstream.status !== 204 && upstream.status !== 304) {
      try {
        const buf = Buffer.from(await upstream.arrayBuffer())
        if (buf.length > MAX_BODY) {
          body = buf.subarray(0, MAX_BODY)
          out['x-xenu-truncated'] = '1'
        } else {
          body = buf
        }
      } catch {
        body = undefined
      }
      if (body !== undefined) out['content-length'] = String(body.length)
    }

    res.writeHead(upstream.status, out)
    res.end(body)
  } catch (err) {
    const cause = err?.cause?.message || err?.message || 'fetch failed'
    res.writeHead(502, {
      ...cors,
      'x-xenu-error': encodeURIComponent(cause),
      'content-type': 'text/plain',
    })
    res.end('proxy error: ' + cause)
  } finally {
    releaseSlot(parsed.hostname)
  }
}

function isPrivateHost(hostname) {
  if (/^localhost$|^127\.|^10\.|^192\.168\.|^169\.254\.|^::1$/.test(hostname)) return true
  const m = hostname.match(/^172\.(\d+)\./)
  if (m) {
    const n = Number(m[1])
    return n >= 16 && n <= 31
  }
  return false
}
