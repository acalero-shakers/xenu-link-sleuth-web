// ============================================================
// Crawl engine — replicates Xenu's Link Sleuth 1.3.9 behavior
// Reverse engineered from binary strings + CHM docs:
//  - BFS by level (default max depth 999)
//  - "internal" = same host prefix (include/exclude prefixes)
//  - external URLs optional (CheckExternal)
//  - HEAD-first for known binary MIME; GET for HTML
//  - redirects tracked and reported
//  - statuses: ok / broken / skipped / not tested
//  - concurrency = Threads (1..100, default 30)
//  - fail-all-same-host option (FailSimilarHosts)
// ============================================================

export const XENU_DEFAULTS = {
  threads: 30,          // [Options] Threads, default 30, slider 1..100
  maxLevel: 999,        // [Options] MaxLevel, default 999
  maxRetry: 1,          // [Options] MaxRetry
  checkExternal: false, // Options menu: "Check external URLs"
  allowCookies: false,  // [Options] AllowCookies
  redirectIsError: false, // [Options] RedirectIsError
  failSimilarHosts: true, // [Options] FailSimilarHosts (default checked)
  excludeMSO: true,     // [Options] ExcludeMSO — filelist.xml, editdata.mso, oledata.mso
  checkDoubleSlash: true, // [Options] CheckDoubleSlash — '//' in path is error on remote
  makeLowerCase: false, // [Options] MakeLowerCase
  timeout: 60,          // [Options] timeout seconds, default 60
  reportSections: {     // [Options] Report*
    brokenByLink: true,     // ReportBroken1
    brokenByPage: true,     // ReportBroken2
    brokenLocal: true,      // ReportBrokenLocal
    redirects: true,        // ReportRedir
    ftpGopher: true,        // ReportFtpGopher
    validUrls: true,        // ReportValid
    siteMap: true,          // SiteMap
    statistics: true,       // ReportStatistics
    orphans: false,         // ReportOrphans (needs FTP)
  },
}

const MSO_EXCLUDES = ['/filelist.xml', '/editdata.mso', '/oledata.mso']

// Schemes Xenu skips (from binary 0x90a00 region)
const SKIP_SCHEME_RE =
  /^(mailto:|news:|tel:|steam:|pnm:|mms:|ldap:|xmpp:|irc:|ymsgr:|callto:|wtai:|rtsp:|view-source:|data:)/i

// Extensions Xenu treats as "known" → HEAD only (binary 0x92f00 list)
const KNOWN_EXT = [
  'gif','jpg','jpeg','png','ico','txt','rtf','pdf','doc','docx','docm',
  'xls','xlsx','xlsm','ppt','pptx','pptm','exe','msi','zip','rar','mpg',
  'mpeg','mp3','mp4','avi','wmv','asx','asf','swf','js','jar','wml','css',
]

// Attributes Xenu extracts URLs from (binary 0x93190 region)
const URL_ATTRS = {
  A: ['href'],
  IMG: ['src', 'srcset', 'longdesc', 'usemap', 'dynsrc', 'lowsrc'],
  LINK: ['href'],
  AREA: ['href'],
  FRAME: ['src', 'longdesc'],
  IFRAME: ['src', 'longdesc'],
  EMBED: ['src', 'pluginspage'],
  INPUT: ['src', 'usemap'],
  BGSOUND: ['src'],
  APPLET: ['code', 'codebase', 'archive'],
  OBJECT: ['data', 'codebase', 'classid', 'usemap'],
  BASE: ['href'],
  BLOCKQUOTE: ['cite'],
  DEL: ['cite'],
  INS: ['cite'],
  Q: ['cite'],
  LAYER: ['src'],
  ILAYER: ['src'],
  VIDEO: ['src', 'poster'],
  AUDIO: ['src'],
  SOURCE: ['src', 'srcset'],
  TRACK: ['src'],
  HTML: ['manifest'],
  GO: ['href'],
}

// ---- proxy support ----
// The app fetches same-origin /xenu-proxy?url=... (vite plugin in dev,
// server.mjs in prod). If the proxy answers, crawl through it; otherwise
// fall back to direct fetch (works only for CORS-enabled targets).
let PROXY_OK = null // null = untested, true/false after probe
const PROXY_PATH = '/xenu-proxy'

async function proxyAvailable() {
  if (PROXY_OK !== null) return PROXY_OK
  try {
    const r = await fetch(PROXY_PATH + '?ping=1', { signal: AbortSignal.timeout(3000) })
    PROXY_OK = r.ok && (await r.text()) === 'pong'
  } catch {
    PROXY_OK = false
  }
  return PROXY_OK
}

function proxiedUrl(url, method) {
  return `${PROXY_PATH}?url=${encodeURIComponent(url)}&method=${method}`
}

export function normalizeUrl(u, base) {
  try {
    const url = new URL(u, base)
    if (!/^https?:$/.test(url.protocol)) return null
    url.hash = '' // Xenu does not check fragments as separate URLs
    return url.href
  } catch {
    return null
  }
}

export function isInternal(urlStr, rootUrl) {
  try {
    const u = new URL(urlStr)
    const r = new URL(rootUrl)
    // Xenu's DomainMatch: host match on the root's domain tail
    return u.hostname === r.hostname || u.hostname.endsWith('.' + rootDomain(r.hostname))
  } catch {
    return false
  }
}

function rootDomain(hostname) {
  const parts = hostname.split('.')
  return parts.length > 2 ? parts.slice(-2).join('.') : hostname
}

/**
 * Extract all URLs from an HTML document string, mirroring Xenu's tag list.
 * Returns [{url, raw, tag, attr, linkText}]
 */
export function extractLinks(html, baseUrl) {
  const out = []
  let doc
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch {
    return out
  }

  const push = (raw, tag, attr, linkText) => {
    if (!raw) return
    const trimmed = raw.trim()
    if (!trimmed || SKIP_SCHEME_RE.test(trimmed)) return
    const abs = normalizeUrl(trimmed, baseUrl)
    if (!abs) return
    out.push({ url: abs, raw: trimmed, tag, attr, linkText: (linkText || '').slice(0, 120) })
  }

  // walk all elements once
  doc.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName
    const attrs = URL_ATTRS[tag]
    if (attrs) {
      for (const a of attrs) {
        const v = el.getAttribute(a)
        if (v) push(v, tag, a, tag === 'A' ? el.textContent : el.getAttribute('title') || el.getAttribute('alt'))
      }
    }
  })

  // <META HTTP-EQUIV="REFRESH" CONTENT="0; URL=...">
  doc.querySelectorAll('meta[http-equiv]').forEach((el) => {
    if (/refresh/i.test(el.getAttribute('http-equiv') || '')) {
      const c = el.getAttribute('content') || ''
      const m = c.match(/url\s*=\s*['"]?([^'";]+)/i)
      if (m) push(m[1], 'META', 'refresh')
    }
  })

  // <STYLE> @import and url(...)
  doc.querySelectorAll('style').forEach((el) => {
    const css = el.textContent || ''
    for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s]+)/gi)) push(m[1], 'STYLE', '@import')
    for (const m of css.matchAll(/url\(\s*['"]?([^'")\s]+)/gi)) push(m[1], 'STYLE', 'url()')
  })

  return out
}

/** Classify a URL the way Xenu decides HEAD vs GET (known file types). */
export function isKnownBinary(urlStr) {
  try {
    const path = new URL(urlStr).pathname
    const ext = (path.split('.').pop() || '').toLowerCase()
    return KNOWN_EXT.includes(ext) && path.includes('.')
  } catch {
    return false
  }
}

export function classifyExclusion(urlStr, opts) {
  if (SKIP_SCHEME_RE.test(urlStr)) return { skipped: true, reason: 'skip scheme' }
  if (opts.excludeMSO && MSO_EXCLUDES.some((m) => urlStr.toLowerCase().endsWith(m)))
    return { skipped: true, reason: 'skip type' }
  if (opts.checkDoubleSlash) {
    try {
      const p = new URL(urlStr)
      if (p.pathname.replace(/^\/+/, '').includes('//')) return { skipped: true, reason: "'//' is always an error when checking remote URLs" }
    } catch { /* ignore */ }
  }
  return { skipped: false }
}

export const COLUMNS = [
  'Address', 'Status', 'Type', 'Size', 'Title', 'Date', 'Level',
  'Links Out', 'Links In', 'Server', 'Error', 'Duration', 'Charset',
]

let idSeq = 1

/**
 * The crawler. Events emitted via onEvent for UI updates.
 * records: Map<url, record>; records are Xenu rows.
 */
export class XenuCrawler {
  constructor(rootUrl, opts = {}) {
    this.rootUrl = rootUrl
    this.opts = { ...XENU_DEFAULTS, ...opts }
    this.records = new Map() // url -> record
    this.backlinks = new Map() // url -> Set(sourceUrl)
    this.queue = [] // {url, level, source}
    this.queued = new Set()
    this.active = 0
    this.paused = false
    this.stopped = false
    this.finished = false
    this.done = 0
    this.onStart = null
    this.onUpdate = null
    this.onFinish = null
    this.onLog = null
  }

  log(...args) {
    this.onLog && this.onLog(args.join(' '))
  }

  getRecord(url, level = 0, source = null) {
    let rec = this.records.get(url)
    if (!rec) {
      rec = {
        id: idSeq++,
        url,
        statusCode: null,
        status: 'not tested',
        statusText: '',
        type: '',
        size: null,
        title: '',
        date: '',
        level,
        linksOut: 0,
        linksIn: 0,
        server: '',
        error: '',
        duration: null,
        charset: '',
        isInternal: isInternal(url, this.rootUrl),
        redirected: false,
        redirectOrigins: [],
        broken: false,
        source,
      }
      this.records.set(url, rec)
    }
    if (source) {
      if (!this.backlinks.has(url)) this.backlinks.set(url, new Set())
      this.backlinks.get(url).add(source)
    }
    return rec
  }

  enqueue(url, level, source) {
    if (this.queued.has(url)) return
    const rec = this.getRecord(url, level, source)
    if (level > this.opts.maxLevel) {
      rec.status = 'skip'
      rec.statusText = 'max level'
      return
    }
    const excl = classifyExclusion(url, this.opts)
    if (excl.skipped) {
      rec.status = 'skip'
      rec.statusText = excl.reason
      return
    }
    const internal = rec.isInternal
    if (!internal && !this.opts.checkExternal) {
      rec.status = 'skip'
      rec.statusText = 'skip external'
      return
    }
    this.queued.add(url)
    this.queue.push({ url, level })
    this.emitUpdate()
  }

  start() {
    this.onStart && this.onStart()
    this.log(`checking ${this.rootUrl}`)
    this.enqueue(this.rootUrl, 0, null)
    this.pump()
  }

  pause() { this.paused = true; this.emitUpdate() }
  continueCrawl() { this.paused = false; this.pump() }
  stop() { this.stopped = true }

  emitUpdate() {
    this.onUpdate && this.onUpdate([...this.records.values()], this.stats())
  }

  stats() {
    let broken = 0, ok = 0, skipped = 0
    for (const r of this.records.values()) {
      if (r.broken) broken++
      else if (r.status === 'ok') ok++
      else if (r.status === 'skip') skipped++
    }
    return {
      total: this.records.size,
      done: this.done,
      active: this.active,
      broken,
      ok,
      skipped,
      queued: this.queue.length,
      finished: this.finished,
      paused: this.paused,
    }
  }

  async pump() {
    if (this.pumping) return
    this.pumping = true
    try {
      while (!this.stopped && !this.paused && this.queue.length > 0 && this.active < this.opts.threads) {
        const job = this.queue.shift()
        this.active++
        // fire-and-forget: concurrency loop keeps pumping
        this.checkUrl(job).finally(() => {
          this.active--
          this.done++
          this.emitUpdate()
          if (!this.paused && !this.stopped) this.pump()
          this.maybeFinish()
        })
      }
      this.maybeFinish()
    } finally {
      this.pumping = false
    }
  }

  maybeFinish() {
    if (this.finished || this.stopped) return
    if (this.queue.length === 0 && this.active === 0) {
      this.finished = true
      this.log('Link sleuth finished')
      this.onFinish && this.onFinish(this.stats())
    }
  }

  async checkUrl({ url, level }) {
    const rec = this.getRecord(url, level)
    if (rec.status !== 'not tested') return // already checked (recheck dedupe)
    const t0 = performance.now()
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.opts.timeout * 1000)
      const method = isKnownBinary(url) ? 'HEAD' : 'GET'
      const useProxy = await proxyAvailable()
      const fetchUrl = useProxy ? proxiedUrl(url, method) : url
      const res = await fetch(fetchUrl, {
        method,
        redirect: 'manual', // Xenu reports redirects explicitly
        signal: controller.signal,
        credentials: 'omit',
        headers: useProxy
          ? {}
          : {
              Accept: this.opts.accept || '*/*',
              ...(this.opts.referer ? { Referer: this.opts.referer } : {}),
            },
      })
      clearTimeout(timer)

      // proxy-level failure (DNS, TLS, connect) → real broken, not fetch CORS noise
      if (useProxy && res.status === 502) {
        rec.duration = Math.round(performance.now() - t0)
        rec.status = 'broken'
        rec.broken = true
        rec.error = decodeURIComponent(res.headers.get('x-xenu-error') || 'no connection')
        if (this.opts.failSimilarHosts) this.failSameHost(safeHost(url), rec.error)
        return
      }

      rec.statusCode = res.status
      rec.duration = Math.round(performance.now() - t0)
      rec.server = res.headers.get('server') || ''
      rec.type = (res.headers.get('content-type') || '').split(';')[0] || ''
      const charsetM = (res.headers.get('content-type') || '').match(/charset=([\w-]+)/i)
      if (charsetM) rec.charset = charsetM[1]
      const lastMod = res.headers.get('last-modified')
      if (lastMod) rec.date = new Date(lastMod).toLocaleDateString()
      const cl = res.headers.get('content-length')
      if (cl) rec.size = parseInt(cl, 10)
      if (res.headers.get('x-xenu-waf')) {
        rec.statusText = 'WAF challenge (cf-mitigated)'
      }

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        rec.redirected = true
        if (loc) {
          const target = normalizeUrl(loc, url)
          rec.statusText = `redirect to ${target}`
          this.enqueue(target, level, null) // follow redirect target
        }
        if (this.opts.redirectIsError) {
          rec.status = 'broken'
          rec.broken = true
          rec.error = 'redirect'
        } else {
          rec.status = 'ok'
        }
        return
      }

      if (res.status >= 400 || res.status < 200) {
        rec.status = 'broken'
        rec.broken = true
        rec.error = `${res.status} ${res.statusText || httpText(res.status)}`
        if (this.opts.failSimilarHosts) this.failSameHost(new URL(url).hostname, rec.error)
        return
      }

      rec.status = 'ok'

      // Only spider HTML for internal URLs (or external if enabled — Xenu does parse them for links too when checked)
      const ct = rec.type
      const isHtml = /html/i.test(ct) || ct === ''
      const bodyLen = parseInt(res.headers.get('content-length') || '0', 10)
      if (method === 'GET' && isHtml) {
        const html = await res.text()
        rec.size = bodyLen || html.length
        const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i)
        if (titleM) rec.title = titleM[1].trim().slice(0, 200)
        const descM = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
        if (descM) rec.description = descM[1].slice(0, 300)
        if (level < this.opts.maxLevel) {
          const links = extractLinks(html, url)
          rec.linksOut = links.length
          for (const l of links) {
            const childInternal = isInternal(l.url, this.rootUrl)
            if (childInternal || this.opts.checkExternal) {
              this.enqueue(l.url, level + 1, url)
            } else {
              const r2 = this.getRecord(l.url, level + 1, url)
              r2.status = 'skip'
              r2.statusText = 'skip external'
            }
          }
        }
      }
    } catch (err) {
      rec.duration = Math.round(performance.now() - t0)
      rec.status = 'broken'
      rec.broken = true
      rec.error = err.name === 'AbortError' ? 'cancelled / timeout' : (err.message || 'no connection')
      try {
        if (this.opts.failSimilarHosts) this.failSameHost(new URL(url).hostname, rec.error)
      } catch { /* ignore */ }
    }
  }

  failSameHost(hostname, error) {
    for (const { url } of this.queue) {
      try {
        if (new URL(url).hostname === hostname) {
          const rec = this.records.get(url)
          if (rec && rec.status === 'not tested') {
            rec.status = 'broken'
            rec.broken = true
            rec.error = error
          }
        }
      } catch { /* ignore */ }
    }
  }

  /** Retry broken links — Ctrl+R in Xenu */
  retryBroken() {
    for (const rec of this.records.values()) {
      if (rec.broken) {
        rec.status = 'not tested'
        rec.broken = false
        rec.error = ''
        this.queued.delete(rec.url)
        this.queue.push({ url: rec.url, level: rec.level })
      }
    }
    this.finished = false
    this.emitUpdate()
    this.pump()
  }

  /** Build backlink counts (Links In) once/periodically */
  recomputeLinksIn() {
    for (const rec of this.records.values()) {
      const bl = this.backlinks.get(rec.url)
      rec.linksIn = bl ? bl.size : 0
    }
  }
}

function safeHost(url) {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function httpText(status) {
  const map = {
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'file not found',
    405: 'Method Not Allowed', 408: 'Request Timeout', 410: 'Gone', 429: 'temporarily overloaded',
    500: 'server error', 501: 'required not supported', 502: 'error response received from gateway',
    503: 'temporarily overloaded', 504: 'timed out waiting for gateway', 505: 'HTTP Version Not Supported',
  }
  return map[status] || ''
}
