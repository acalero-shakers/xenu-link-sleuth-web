// Vercel Serverless Function — same-origin crawl proxy for production.
// Rewritten from /xenu-proxy via vercel.json so the browser crawler keeps
// calling /xenu-proxy?url=… (same path as the Vite plugin in local dev).
import { handleProxy } from '../proxy/core.mjs'

// Hobby caps lower; Pro allows up to 60s. Upstream default XENU_TIMEOUT_MS is 65s.
export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  try {
    await handleProxy(req, res)
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('content-type', 'text/plain')
      res.end('proxy crash: ' + (err?.message || String(err)))
    }
  }
}
