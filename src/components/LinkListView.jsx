import React, { useMemo, useState } from 'react'

/**
 * Main ListView — replicates Xenu's CListView columns, colors and sorting.
 * Colors from CHM results.html: ok #008C00, broken #FF0000,
 * skipped #000064, not-tested #606060.
 */
export function LinkListView({ records, showBrokenOnly, onRowActivate, sort, onSort }) {
  const [selected, setSelected] = useState(null)
  const sorted = useMemo(() => {
    let rows = showBrokenOnly ? records.filter((r) => r.broken) : records
    if (sort.key) {
      rows = [...rows].sort((a, b) => {
        let va = a[sort.key] ?? ''
        let vb = b[sort.key] ?? ''
        if (typeof va === 'number' && typeof vb === 'number') return va - vb
        va = String(va).toLowerCase()
        vb = String(vb).toLowerCase()
        return sort.dir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb)
      })
    }
    return rows
  }, [records, showBrokenOnly, sort])

  const COLUMNS = [
    ['url', 'Address', 380],
    ['status', 'Status', 130],
    ['type', 'Type', 90],
    ['size', 'Size', 70],
    ['title', 'Title', 200],
    ['date', 'Date', 80],
    ['level', 'Level', 40],
    ['linksOut', 'Links Out', 55],
    ['linksIn', 'Links In', 50],
    ['server', 'Server', 110],
    ['error', 'Error', 180],
    ['duration', 'Duration', 60],
    ['charset', 'Charset', 70],
  ]

  const statusClass = (r) => {
    if (r.broken) return 'c-broken'
    if (r.status === 'ok') return 'c-ok'
    if (r.status === 'skip') return 'c-skipped'
    return 'c-untested'
  }

  return (
    <div className="listview-wrap bevel-in">
      <table className="listview">
        <thead>
          <tr>
            {COLUMNS.map(([key, label, width]) => (
              <th
                key={key}
                style={{ minWidth: width }}
                className={sort.key === key ? (sort.dir === 'desc' ? 'sorted-desc' : 'sorted-asc') : ''}
                onClick={() => onSort(key)}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              className={`${statusClass(r)} ${selected === r.id ? 'selected' : ''}`}
              onClick={() => setSelected(r.id)}
              onDoubleClick={() => onRowActivate(r)}
              onContextMenu={(e) => { e.preventDefault(); setSelected(r.id); onRowActivate(r) }}
            >
              <td title={r.url}>{r.url}</td>
              <td className={statusClass(r)}>{r.status === 'ok' ? 'ok' : r.status === 'skip' ? `skip${r.statusText ? ` (${r.statusText})` : ''}` : r.broken ? 'broken' : r.status}{r.redirected ? ' (redirect)' : ''}</td>
              <td>{r.type}</td>
              <td style={{ textAlign: 'right' }}>{r.size != null ? fmtSize(r.size) : ''}</td>
              <td title={r.title}>{r.title}</td>
              <td>{r.date}</td>
              <td style={{ textAlign: 'right' }}>{r.level}</td>
              <td style={{ textAlign: 'right' }}>{r.linksOut || ''}</td>
              <td style={{ textAlign: 'right' }}>{r.linksIn || ''}</td>
              <td>{r.server}</td>
              <td title={r.error}>{r.error}</td>
              <td style={{ textAlign: 'right' }}>{r.duration != null ? (r.duration / 1000).toFixed(3) : ''}</td>
              <td>{r.charset}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmtSize(n) {
  if (n == null) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
