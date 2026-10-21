import React, { useState } from 'react'
import { Window } from './Chrome.jsx'
import { XENU_DEFAULTS } from '../engine/crawler.js'

/**
 * "Xenu's Link Sleuthing Options" — Basic + Advanced property pages,
 * replicated from binary strings (0x9e300 region) + CHM.
 */
export function PreferencesDialog({ initial, onOk, onCancel }) {
  const [tab, setTab] = useState('basic')
  const [threads, setThreads] = useState(initial?.threads ?? XENU_DEFAULTS.threads)
  const [maxLevel, setMaxLevel] = useState(initial?.maxLevel ?? XENU_DEFAULTS.maxLevel)
  const [retries, setRetries] = useState(initial?.maxRetry ?? XENU_DEFAULTS.maxRetry)
  const [redirectIsError, setRedirectIsError] = useState(initial?.redirectIsError ?? false)
  const [report, setReport] = useState({ ...XENU_DEFAULTS.reportSections, ...(initial?.reportSections || {}) })
  const [advanced, setAdvanced] = useState({
    allowCookies: initial?.allowCookies ?? false,
    failSimilarHosts: initial?.failSimilarHosts ?? true,
    excludeMSO: initial?.excludeMSO ?? true,
    allowLocalFiles: initial?.allowLocalFiles ?? false,
    listLocalDirectories: initial?.listLocalDirectories ?? false,
    makeLowerCase: initial?.makeLowerCase ?? false,
  })

  const REPORT_ITEMS = [
    ['brokenByLink', 'Broken links, ordered by links'],
    ['brokenByPage', 'Broken links, ordered by page'],
    ['brokenLocal', 'Broken local links'],
    ['redirects', 'Redirected URLs'],
    ['ftpGopher', 'Ftp and gopher URLs'],
    ['validUrls', 'Valid text URLs'],
    ['siteMap', 'Site Map'],
    ['statistics', 'Statistics'],
    ['orphans', 'Orphan files'],
  ]

  return (
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <Window title="Xenu's Link Sleuthing Options" onClose={onCancel} style={{ width: 420 }}>
        <div className="tabstrip" style={{ margin: '-4px -4px 8px' }}>
          <div className={`tab ${tab === 'basic' ? 'active' : ''}`} onClick={() => setTab('basic')}>Basic</div>
          <div className={`tab ${tab === 'advanced' ? 'active' : ''}`} onClick={() => setTab('advanced')}>Advanced</div>
        </div>

        {tab === 'basic' && (
          <>
            <fieldset className="x95">
              <legend>Parallel Threads</legend>
              <div className="trackbar">
                <input type="range" min="1" max="100" value={threads} onChange={(e) => setThreads(+e.target.value)} />
                <span>Current: {threads}</span>
              </div>
              <div style={{ marginTop: 4 }}>
                Maximum depth:{' '}
                <input className="x95" type="number" min="0" max="9999" style={{ width: 70 }} value={maxLevel} onChange={(e) => setMaxLevel(+e.target.value)} />
              </div>
            </fieldset>
            <fieldset className="x95">
              <legend>Report</legend>
              {REPORT_ITEMS.map(([key, label]) => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={report[key]}
                    onChange={(e) => setReport({ ...report, [key]: e.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          </>
        )}

        {tab === 'advanced' && (
          <>
            <fieldset className="x95">
              {[
                ['allowCookies', 'Allow Cookies (read FAQ first!!)'],
                ['failSimilarHosts', 'Fail all http and ftp URLs with same failed host'],
                ['excludeMSO', 'Exclude MSO files'],
                ['allowLocalFiles', 'Allow local files in remote check'],
                ['listLocalDirectories', 'List local directories'],
                ['makeLowerCase', 'Convert internal URLs to lower case'],
              ].map(([key, label]) => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={advanced[key]}
                    onChange={(e) => setAdvanced({ ...advanced, [key]: e.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ))}
              <label className="check">
                <input type="checkbox" checked={redirectIsError} onChange={(e) => setRedirectIsError(e.target.checked)} />
                <span>Treat redirections as errors</span>
              </label>
            </fieldset>
            <div style={{ marginTop: 6 }}>
              Retries:{' '}
              <input className="x95" type="number" min="0" max="20" style={{ width: 60 }} value={retries} onChange={(e) => setRetries(+e.target.value)} />
            </div>
          </>
        )}

        <div className="dialog-buttons" style={{ padding: '14px 0 0' }}>
          <button className="x95" style={{ minWidth: 70 }} onClick={() => onOk({
            threads, maxLevel, maxRetry: retries, redirectIsError,
            reportSections: report, ...advanced,
          })}>OK</button>
          <button className="x95" style={{ minWidth: 70 }} onClick={onCancel}>Cancel</button>
        </div>
      </Window>
    </div>
  )
}
