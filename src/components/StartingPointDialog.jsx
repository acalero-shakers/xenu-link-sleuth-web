import React, { useState } from 'react'
import { Window } from './Chrome.jsx'

/**
 * "Xenu's starting point" dialog — replicated from the binary's dynamic
 * property sheet (strings at 0x9cd00-0x9d200) + CHM docs.
 */
export function StartingPointDialog({ onOk, onCancel, initial }) {
  const [url, setUrl] = useState(initial?.url || '')
  const [include, setInclude] = useState(initial?.include || '')
  const [exclude, setExclude] = useState(initial?.exclude || '')
  const [checkExternal, setCheckExternal] = useState(initial?.checkExternal || false)
  const [maxDepth, setMaxDepth] = useState(initial?.maxDepth ?? 999)
  const [post, setPost] = useState(initial?.post || '')

  const submit = () => {
    if (!url.trim()) {
      alert('Please enter an URL first!')
      return
    }
    onOk({
      url: url.trim(),
      include: include.trim(),
      exclude: exclude.trim(),
      checkExternal,
      maxDepth: Math.max(0, Math.min(9999, parseInt(maxDepth) || 999)),
      post: post.trim(),
    })
  }

  return (
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <Window title="Xenu's starting point" onClose={onCancel} style={{ width: 460 }}>
        <div style={{ marginBottom: 8, lineHeight: 1.5 }}>
          What address do you want to check?<br />
          (Enter your "root URL", e.g. http://www.host.com/~user/<br />
          and all local pages linked from it will also be checked)<br />
          Or click "Browse" to check your local files the same way!
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <span style={{ paddingTop: 3 }}>&amp;New</span>
          <input
            className="x95"
            style={{ flex: 1 }}
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="http://"
          />
        </div>

        <fieldset className="x95">
          <legend>Consider URLs beginning with this as 'internal':</legend>
          <input className="x95" style={{ width: '100%' }} value={include} onChange={(e) => setInclude(e.target.value)} />
        </fieldset>

        <fieldset className="x95">
          <legend>Do not check any URLs beginning with this:</legend>
          <input className="x95" style={{ width: '100%' }} value={exclude} onChange={(e) => setExclude(e.target.value)} />
        </fieldset>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <label className="check">
            <input type="checkbox" checked={checkExternal} onChange={(e) => setCheckExternal(e.target.checked)} />
            Check external links
          </label>
          <label>
            Maximum depth:{' '}
            <input className="x95" type="number" min="0" max="9999" style={{ width: 60 }} value={maxDepth} onChange={(e) => setMaxDepth(e.target.value)} />
          </label>
        </div>

        {post && (
          <fieldset className="x95" style={{ marginTop: 6 }}>
            <legend>POST query string:</legend>
            <input className="x95" style={{ width: '100%' }} value={post} onChange={(e) => setPost(e.target.value)} />
            <div style={{ marginTop: 4, fontStyle: 'italic' }}>root URL is for a HTML FORM submitted with POST (read the FAQ!)</div>
          </fieldset>
        )}

        <div className="dialog-buttons" style={{ padding: '12px 0 0' }}>
          <button className="x95" onClick={submit} style={{ minWidth: 70 }}>OK</button>
          <button className="x95" onClick={onCancel} style={{ minWidth: 70 }}>Cancel</button>
          <button className="x95" onClick={() => alert('Select a local file to check (directory index)')} style={{ minWidth: 90 }}>Local file...</button>
          <button
            className="x95"
            style={{ minWidth: 100 }}
            onClick={() => document.dispatchEvent(new CustomEvent('xenu:more-options'))}
          >
            More &amp;options...
          </button>
        </div>
      </Window>
    </div>
  )
}
