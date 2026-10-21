// Report generator — mirrors Xenu's HTML report sections
// Sections (from CHM + binary): broken by link, broken by page, broken local,
// redirects, ftp/gopher, valid URLs, site map, orphans, statistics for managers.

export function buildReport(records, rootUrl, opts = {}) {
  const byUrl = new Map(records.map((r) => [r.url, r]))
  const broken = records.filter((r) => r.broken)
  const brokenInternal = broken.filter((r) => r.isInternal)
  const brokenLocal = broken.filter((r) => r.error && r.error.includes('file not found') && r.isInternal)
  const redirects = records.filter((r) => r.redirected)
  const valid = records.filter((r) => r.status === 'ok' && r.isInternal && r.type && /html|text|pdf|doc|rtf|ppt|xls/i.test(r.type))
  const htmlPages = valid.filter((r) => /html/i.test(r.type) && r.title)
  const sections = []

  sections.push({
    id: 'broken-by-link',
    title: 'Broken links, ordered by link',
    enabled: opts.reportSections?.brokenByLink !== false,
    rows: broken,
    cols: ['url', 'error', 'linksIn'],
  })

  sections.push({
    id: 'broken-by-page',
    title: 'Broken links, ordered by page',
    enabled: opts.reportSections?.brokenByPage !== false,
    rows: groupByPage(broken),
    cols: ['page', 'brokenOnPage'],
    custom: true,
  })

  sections.push({
    id: 'broken-local',
    title: 'Broken local links',
    enabled: opts.reportSections?.brokenLocal !== false,
    rows: brokenLocal,
    cols: ['url', 'error'],
  })

  sections.push({
    id: 'redirects',
    title: 'List of redirected URLs',
    enabled: opts.reportSections?.redirects !== false,
    rows: redirects,
    cols: ['url', 'statusText'],
  })

  sections.push({
    id: 'valid',
    title: 'List of valid URLs you can submit to a search engine',
    enabled: opts.reportSections?.validUrls !== false,
    rows: valid,
    cols: ['url', 'type', 'size', 'date'],
  })

  sections.push({
    id: 'sitemap',
    title: 'Site Map of valid HTML pages with a title',
    enabled: opts.reportSections?.siteMap !== false,
    rows: htmlPages,
    cols: ['level', 'url', 'title'],
    tree: true,
  })

  sections.push({
    id: 'stats',
    title: 'Statistics for managers',
    enabled: opts.reportSections?.statistics !== false,
    custom: 'stats',
    rows: [],
  })

  return { rootUrl, sections, totals: computeTotals(records) }
}

function groupByPage(broken) {
  const byPage = new Map()
  for (const r of broken) {
    // find pages linking to this broken URL
    const pages = r.backlinks || []
    for (const p of pages) {
      if (!byPage.has(p)) byPage.set(p, [])
      byPage.get(p).push(r)
    }
  }
  return [...byPage.entries()].map(([page, links]) => ({ page, links, count: links.length }))
}

function computeTotals(records) {
  const t = { urls: records.length, broken: 0, ok: 0, skipped: 0, bytes: 0 }
  const mime = new Map()
  for (const r of records) {
    if (r.broken) t.broken++
    else if (r.status === 'ok') t.ok++
    else t.skipped++
    if (r.size) t.bytes += r.size
    const key = r.type || 'unknown'
    if (!mime.has(key)) mime.set(key, { count: 0, bytes: 0, min: Infinity, max: 0 })
    const m = mime.get(key)
    m.count++
    if (r.size) {
      m.bytes += r.size
      m.min = Math.min(m.min, r.size)
      m.max = Math.max(m.max, r.size)
    }
  }
  t.mime = [...mime.entries()].map(([type, m]) => ({ type, ...m, min: m.min === Infinity ? 0 : m.min }))
  return t
}

/** Xenu TAB export header (from binary 0x93510) */
export const EXPORT_HEADER =
  'Address\tStatus-Code\tStatus-Text\tType\tSize\tTitle\tDate\tLevel\tLinks Out\tLinks In\tServer\tError\tDuration\tCharset\tDescription\tKeywords'

export function exportTab(records) {
  const lines = [EXPORT_HEADER]
  for (const r of records) {
    lines.push([
      r.url, r.statusCode ?? '', r.statusText || '', r.type || '', r.size ?? '',
      r.title || '', r.date || '', r.level, r.linksOut, r.linksIn,
      r.server || '', r.error || '', r.duration ?? '', r.charset || '',
      r.description || '', r.keywords || '',
    ].join('\t'))
  }
  return lines.join('\n')
}

/** Google Sitemap XML (Create Google Sitemap File... Ctrl+G) */
export function exportSitemap(records) {
  const urls = records.filter(
    (r) => r.status === 'ok' && r.isInternal &&
      /html|pdf|doc|docx|xls|xlsx|ppt|pptx|rtf/i.test(r.type || '')
  )
  const today = new Date().toISOString().slice(0, 10)
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  for (const r of urls) {
    xml += '\t<url>\n'
    xml += `\t\t<loc>${esc(r.url)}</loc>\n`
    xml += '\t\t<priority>0.9</priority>\n'
    xml += '\t\t<changefreq>monthly</changefreq>\n'
    xml += `\t\t<lastmod>${r.date || today}</lastmod>\n`
    xml += '\t</url>\n'
  }
  xml += '</urlset>'
  return xml
}

/** GraphViz .gv export (Export to GraphViz File...) */
export function exportGraphViz(records, backlinks) {
  const esc = (s) => s.replace(/"/g, '\\"')
  const lines = ['digraph xenu {', '  node [shape=box];']
  for (const r of records) {
    if (r.level <= 2) lines.push(`  "${esc(r.url)}" [label="${esc(r.title || r.url)}"];`)
  }
  if (backlinks) {
    for (const [target, sources] of backlinks) {
      for (const src of sources) {
        lines.push(`  "${esc(src)}" -> "${esc(target)}";`)
      }
    }
  }
  lines.push('}')
  return lines.join('\n')
}
