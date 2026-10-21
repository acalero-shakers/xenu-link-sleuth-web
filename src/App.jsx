import React, { useState, useEffect, useCallback, useRef } from 'react'
import { MenuBar } from './components/MenuBar.jsx'
import { Toolbar, StatusBar, CreditsFooter } from './components/Chrome.jsx'
import { LinkListView } from './components/LinkListView.jsx'
import { StartingPointDialog } from './components/StartingPointDialog.jsx'
import { PreferencesDialog } from './components/PreferencesDialog.jsx'
import { UrlPropertiesDialog, AboutDialog } from './components/Dialogs.jsx'
import { XenuCrawler } from './engine/crawler.js'
import { DEMO_RECORDS, DEMO_ROOT } from './engine/demoData.js'
import { buildReport, exportTab, exportSitemap, exportGraphViz } from './engine/report.js'
import './styles/win95.css'

// Toolbar icons extracted from Xenu.exe BITMAP 130 (16x15 strip of 10 buttons)
const TB = [
  { id: 'new', glyph: '📄', title: 'Check URL... (Ctrl+N)' },
  '-',
  { id: 'open', glyph: '📂', title: 'Open... (Ctrl+O)' },
  { id: 'save', glyph: '💾', title: 'Save (Ctrl+S)' },
  '-',
  { id: 'report', glyph: '🚀', title: 'Report (R)' },
  { id: 'pause', glyph: '⏸', title: 'Pause' },
  { id: 'stop', glyph: '⏹', title: 'Stop immediately' },
  { id: 'retry', glyph: '🔎', title: 'Retry broken links (Ctrl+R)' },
  '-',
  { id: 'props', glyph: '📋', title: 'URL properties (ALT-ENTER)' },
  { id: 'email', glyph: '✉', title: 'e-mail report' },
  '-',
  { id: 'help', glyph: '❓', title: 'Help' },
]

export default function App() {
  const [records, setRecords] = useState([])
  const [stats, setStats] = useState({ total: 0, done: 0, active: 0, broken: 0, queued: 0, finished: true, paused: false })
  const [showBrokenOnly, setShowBrokenOnly] = useState(false)
  const [checkExternalMenu, setCheckExternalMenu] = useState(false)
  const [showToolbar, setShowToolbar] = useState(true)
  const [showStatus, setShowStatus] = useState(true)
  const [dialog, setDialog] = useState(null) // 'new' | 'prefs' | 'props' | 'about' | 'report'
  const [propsRecord, setPropsRecord] = useState(null)
  const [sort, setSort] = useState({ key: 'id', dir: 'asc' })
  const [opts, setOpts] = useState(null) // last used options
  const [reportHtml, setReportHtml] = useState('')
  const crawlerRef = useRef(null)
  const [findText, setFindText] = useState('')

  const rootUrl = opts?.url || ''

  // demo mode: ?demo=1 preloads sample crawl results (screenshots, UI dev)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('demo')) {
      setRecords(DEMO_RECORDS)
      setOpts({ url: DEMO_ROOT })
      setStats({ total: DEMO_RECORDS.length, done: DEMO_RECORDS.length, active: 0, broken: 2, queued: 0, finished: true, paused: false })
    }
  }, [])

  useEffect(() => {
    const handler = () => setDialog('prefs')
    document.addEventListener('xenu:more-options', handler)
    return () => document.removeEventListener('xenu:more-options', handler)
  }, [])

  // keyboard shortcuts (Xenu accelerators)
  useEffect(() => {
    const h = (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'n') { e.preventDefault(); setDialog('new') }
      else if (ctrl && e.key === 'b') { e.preventDefault(); setShowBrokenOnly((v) => !v) }
      else if (ctrl && e.key === 'r') { e.preventDefault(); crawlerRef.current?.retryBroken() }
      else if (e.key === 'F3' || (ctrl && e.key === 'f')) { e.preventDefault(); doFind() }
      else if (/^[rR]$/.test(e.key) && !ctrl && dialog === null && rootUrl) { doReport() }
      else if (e.key === 'Escape' && dialog) setDialog(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  // Build report from the live crawler (or demo state). Must NOT close over
  // React `records`/`opts` from the render that started the crawl — onFinish
  // captures that stale snapshot (often [] / missing root URL) and shows an
  // empty "0 URLs found" report even when the list view is full.
  const doReport = (crawlerOverride = null) => {
    // Menu onClick may pass a MouseEvent; only treat real XenuCrawler instances.
    const crawler =
      crawlerOverride && typeof crawlerOverride.records?.values === 'function'
        ? crawlerOverride
        : crawlerRef.current
    const recs = crawler
      ? (() => {
          crawler.recomputeLinksIn()
          return [...crawler.records.values()]
        })()
      : records
    const root = crawler?.rootUrl || opts?.url || rootUrl || ''
    const rep = buildReport(recs, root, { reportSections: opts?.reportSections })
    setReportHtml(renderReportHtml(rep))
    setDialog('report')
  }

  const startCheck = (cfg) => {
    const crawler = new XenuCrawler(cfg.url, {
      checkExternal: cfg.checkExternal || checkExternalMenu,
      maxLevel: cfg.maxDepth,
      threads: opts?.threads || 30,
      ...(opts || {}),
      ...cfg,
    })
    crawlerRef.current = crawler
    crawler.onUpdate = (recs, st) => {
      crawler.recomputeLinksIn()
      setRecords([...recs])
      setStats(st)
    }
    crawler.onFinish = (st) => {
      setStats(st)
      // Pass the crawler that finished so we never read a stale React snapshot.
      if (st.broken > 0 || confirm('Link sleuth finished. Do you want a report?')) {
        doReport(crawler)
      }
    }
    crawler.onLog = () => {}
    setOpts((prev) => ({ ...(prev || {}), ...cfg }))
    setDialog(null)
    setRecords([])
    crawler.start()
  }

  const doFind = () => {
    const t = prompt('Find what:', findText)
    if (!t) return
    setFindText(t)
    const hit = records.find((r) => r.url.toLowerCase().includes(t.toLowerCase()) || (r.title || '').toLowerCase().includes(t.toLowerCase()))
    if (hit) setSort({ key: 'url', dir: 'asc' })
    else alert('Search String Not Found!')
  }

  const download = (name, content, mime = 'text/plain') => {
    const blob = new Blob([content], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
  }

  const menus = [
    {
      label: '&File'.replace('&', ''),
      items: [
        { label: 'Check URL...', shortcut: 'Ctrl+N', onClick: () => setDialog('new') },
        { label: 'Open...', shortcut: 'Ctrl+O', disabled: true },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: () => download('xenu-results.tab', exportTab(records)) },
        { label: 'Save As...', disabled: true },
        '-',
        { label: 'Export to TAB separated file...', shortcut: 'Ctrl+T', onClick: () => download('xenu-export.txt', exportTab(records)) },
        { label: 'Export Page Map to TAB separated File...', disabled: !rootUrl, onClick: () => download('xenu-pagemap.txt', exportTab(records.filter((r) => r.linksOut > 0))) },
        { label: 'Export to GraphViz File...', disabled: !rootUrl, onClick: () => download('xenu.gv', exportGraphViz(records, crawlerRef.current?.backlinks)) },
        { label: 'Create Google Sitemap File...', shortcut: 'Ctrl+G', disabled: !rootUrl, onClick: () => download('sitemap.xml', exportSitemap(records), 'application/xml') },
        '-',
        { label: 'Pause', disabled: stats.finished || stats.paused, onClick: () => crawlerRef.current?.pause() },
        { label: 'Continue', disabled: !stats.paused, onClick: () => crawlerRef.current?.continueCrawl() },
        { label: 'Stop immediately', disabled: stats.finished, onClick: () => crawlerRef.current?.stop() },
        { label: 'Retry broken links', shortcut: 'Ctrl+R', disabled: !stats.broken, onClick: () => crawlerRef.current?.retryBroken() },
        { label: 'Report', shortcut: 'R', disabled: !rootUrl, onClick: doReport },
        '-',
        { label: 'Exit', shortcut: 'Ctrl+Q', onClick: () => alert('Close the browser tab to exit.') },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => document.execCommand('copy') },
        '-',
        { label: 'Find...', shortcut: 'Ctrl+F', onClick: doFind },
        { label: 'Find Again', shortcut: 'F3', onClick: doFind },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Show broken links only', shortcut: 'Ctrl+B', onClick: () => setShowBrokenOnly((v) => !v) },
        '-',
        { label: 'Toolbar', onClick: () => setShowToolbar((v) => !v) },
        { label: 'Status Bar', onClick: () => setShowStatus((v) => !v) },
        '-',
        { label: 'URL properties...', shortcut: 'ALT-ENTER', disabled: !propsRecord, onClick: () => propsRecord && setDialog('props') },
      ],
    },
    {
      label: 'Options',
      items: [
        { label: 'Check external URLs', checked: checkExternalMenu, onClick: () => setCheckExternalMenu((v) => !v) },
        '-',
        { label: 'Preferences...', onClick: () => setDialog('prefs') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Tips and Tricks...', onClick: () => window.open('https://home.snafu.de/tilman/xenulink.html', '_blank') },
        '-',
        { label: 'About Xenu...', onClick: () => setDialog('about') },
      ],
    },
  ]

  const statusPanes = [
    { text: stats.finished && stats.done > 0 ? 'Ready' : stats.paused ? 'Paused' : `Checking ${rootUrl}`, grow: true },
    { text: `${stats.done} of ${stats.total} URLs (${stats.total ? Math.round((stats.done / stats.total) * 100) : 0} %) done`, width: 220 },
    { text: `Threads: ${stats.active}`, width: 80 },
    { text: stats.broken ? `broken: ${stats.broken}` : 'no broken links', width: 110 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <MenuBar menus={menus} />
      {showToolbar && (
        <Toolbar
          buttons={TB}
          enabled={{
            new: true, open: false, save: records.length > 0, report: !!rootUrl,
            pause: !stats.finished && !stats.paused, stop: !stats.finished,
            retry: stats.broken > 0, props: !!propsRecord, email: false, help: true,
          }}
          onCommand={(id) => {
            if (id === 'new') setDialog('new')
            else if (id === 'save') download('xenu-results.tab', exportTab(records))
            else if (id === 'report') doReport()
            else if (id === 'pause') crawlerRef.current?.pause()
            else if (id === 'stop') crawlerRef.current?.stop()
            else if (id === 'retry') crawlerRef.current?.retryBroken()
            else if (id === 'props') propsRecord && setDialog('props')
            else if (id === 'help') setDialog('about')
          }}
        />
      )}

      <div className="mdi-area">
        <div className="mdi-child">
          <LinkListView
            records={records}
            showBrokenOnly={showBrokenOnly}
            sort={sort}
            onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
            onRowActivate={(r) => setPropsRecord(r)}
          />
        </div>
      </div>

      {showStatus && <StatusBar panes={statusPanes} />}
      <CreditsFooter />

      {dialog === 'new' && (
        <StartingPointDialog
          initial={opts}
          onOk={startCheck}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'prefs' && (
        <PreferencesDialog
          initial={opts}
          onOk={(newOpts) => { setOpts((o) => ({ ...o, ...newOpts })); setDialog(null) }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'props' && propsRecord && (
        <UrlPropertiesDialog
          record={propsRecord}
          records={records}
          backlinks={crawlerRef.current?.backlinks}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'about' && <AboutDialog onClose={() => setDialog(null)} />}
      {dialog === 'report' && (
        <div className="dialog-overlay">
          <div className="window" style={{ width: '90vw', height: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="window-titlebar">
              <span className="title">Broken link report for {rootUrl}</span>
              <button className="title-btn" onClick={() => setDialog(null)}>✕</button>
            </div>
            <div className="window-body" style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
              <iframe title="report" srcDoc={reportHtml} style={{ width: '100%', height: '100%', border: 0 }} />
            </div>
            <div className="dialog-buttons">
              <button className="x95" onClick={() => download('xenu-report.html', reportHtml, 'text/html')}>Save HTML</button>
              <button className="x95" onClick={() => setDialog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function renderReportHtml(rep) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Broken link report for ${esc(rep.rootUrl)}</title>
<style>body{font-family:Tahoma,sans-serif;font-size:12px;margin:16px}h1,h2{color:#000080}table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #999;padding:3px 8px;font-size:12px}a{color:#0000ee}.broken{color:#f00}.ok{color:#008c00}</style></head><body>`
  html += `<h1>Broken link report</h1>`
  html += `<h2>Root URL: <a href="${esc(rep.rootUrl)}">${esc(rep.rootUrl)}</a></h2>`
  html += `<p><b>${rep.totals.urls}</b> URLs found: <span class="ok">${rep.totals.ok} ok</span>, <span class="broken">${rep.totals.broken} broken</span>, ${rep.totals.skipped} skipped</p>`

  for (const s of rep.sections) {
    if (!s.enabled || (s.id !== 'stats' && s.rows.length === 0)) continue
    html += `<h2 id="${s.id}">${esc(s.title)}</h2>`
    if (s.custom === 'stats') {
      html += '<table><tr><td>MIME type</td><td>count</td><td>Σ size</td><td>min</td><td>max</td></tr>'
      for (const m of rep.totals.mime) {
        html += `<tr><td>${esc(m.type)}</td><td>${m.count}</td><td>${m.bytes}</td><td>${m.min}</td><td>${m.max}</td></tr>`
      }
      html += '</table>'
      continue
    }
    if (s.custom) {
      html += '<table><tr><th>Page</th><th>Broken links</th></tr>'
      for (const row of s.rows) html += `<tr><td>${esc(row.page)}</td><td>${row.count}</td></tr>`
      html += '</table>'
      continue
    }
    html += '<table><tr>' + s.cols.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr>'
    for (const r of s.rows) {
      html += '<tr>' + s.cols.map((c) => `<td>${c === 'url' ? `<a href="${esc(r.url)}">${esc(r.url)}</a>` : esc(r[c])}</td>`).join('') + '</tr>'
    }
    html += '</table>'
  }
  html += '<hr><p><i>This report has been created with Xenu&#39;s Link Sleuth — Web Edition</i></p></body></html>'
  return html
}
