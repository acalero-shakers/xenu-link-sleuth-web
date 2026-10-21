import React from 'react'
import { Window } from './Chrome.jsx'

/** URL Properties dialog — ALT-ENTER in Xenu; bottom lists "Links on this page" / "Pages linking to this one". */
export function UrlPropertiesDialog({ record, records, backlinks, onClose }) {
  const linksOut = (record.linksOutList || []).slice(0, 100)
  const linksIn = backlinks?.get ? [...(backlinks.get(record.url) || [])] : [...(record.backlinks || [])]
  return (
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Window title="URL Properties" onClose={onClose} style={{ width: 560 }} footer={<button className="x95" onClick={onClose}>Close</button>}>
        <div style={{ marginBottom: 8 }}>
          <div><b>Page URL:</b></div>
          <input className="x95" style={{ width: '100%' }} readOnly value={record.url} />
          <div style={{ marginTop: 6 }}><b>Title or link text:</b></div>
          <input className="x95" style={{ width: '100%' }} readOnly value={record.title || record.statusText || ''} />
          <div style={{ marginTop: 6 }}>
            <b>Status:</b> {record.statusCode ?? ''} {record.error || record.status}{' '}
            <b>Type:</b> {record.type} <b>Size:</b> {record.size ?? ''} <b>Level:</b> {record.level}
          </div>
        </div>
        <fieldset className="x95">
          <legend>Links on this page:</legend>
          <select className="x95" size={5} style={{ width: '100%' }}>
            {linksOut.map((u) => <option key={u}>{u}</option>)}
          </select>
        </fieldset>
        <fieldset className="x95">
          <legend>Pages linking to this one:</legend>
          <select className="x95" size={5} style={{ width: '100%' }}>
            {linksIn.map((u) => <option key={u}>{u}</option>)}
          </select>
        </fieldset>
      </Window>
    </div>
  )
}

/** About dialog — from DIALOG 100 resource. */
export function AboutDialog({ onClose }) {
  return (
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Window title="About Xenu" onClose={onClose} style={{ width: 340 }} footer={<button className="x95" onClick={onClose}>OK</button>}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <img src="/icons/doc-icon.png" alt="Xenu" style={{ width: 45, height: 36, imageRendering: 'pixelated' }} />
          <div>
            <div><b>Xenu's Link Sleuth — Web Edition 1.3.9</b></div>
            <div>Replica of Xenu's Link Sleuth 1.3.9</div>
            <div>Copyright © 1997 - 2017 Tilman Hausherr</div>
            <div style={{ marginTop: 4, fontStyle: 'italic' }}>Web replica: reverse-engineered UI + crawler</div>
          </div>
        </div>
      </Window>
    </div>
  )
}
