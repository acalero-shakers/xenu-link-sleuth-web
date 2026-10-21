import React from 'react'

export function Toolbar({ buttons, onCommand, enabled }) {
  return (
    <div className="toolbar">
      {buttons.map((b, i) =>
        b === '-' ? (
          <span key={i} className="tb-sep" />
        ) : (
          <button
            key={b.id}
            className="tb-btn"
            title={b.title}
            disabled={!enabled[b.id]}
            onClick={() => onCommand(b.id)}
          >
            {b.img ? <img src={b.img} alt={b.title} /> : <span>{b.glyph}</span>}
          </button>
        )
      )}
    </div>
  )
}

export function StatusBar({ panes }) {
  return (
    <div className="statusbar">
      {panes.map((p, i) => (
        <div key={i} className={`status-pane ${p.grow ? 'grow' : ''}`} style={{ width: p.width }}>
          {p.text}
        </div>
      ))}
    </div>
  )
}

export function Window({ title, children, onClose, style, footer }) {
  return (
    <div className="window" style={style}>
      <div className="window-titlebar">
        <span className="title">{title}</span>
        <button className="title-btn" onClick={onClose}>✕</button>
      </div>
      <div className="window-body">{children}</div>
      {footer && <div className="dialog-buttons">{footer}</div>}
    </div>
  )
}
