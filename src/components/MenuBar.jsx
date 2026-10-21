import React, { useState, useRef, useEffect } from 'react'

// Classic Win95 menu bar with popups — mirrors MENU 129 resource of Xenu.exe
export function MenuBar({ menus }) {
  const [open, setOpen] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="menubar" ref={ref}>
      {menus.map((m, mi) => (
        <div key={m.label} className="menu-root">
          <div
            className={`menu-title ${open === mi ? 'open' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setOpen(open === mi ? null : mi) }}
            onMouseEnter={() => open !== null && setOpen(mi)}
          >
            {m.label}
          </div>
          {open === mi && (
            <div className="menu-popup">
              {m.items.map((it, ii) =>
                it === '-' ? (
                  <div key={ii} className="menu-sep" />
                ) : (
                  <div
                    key={ii}
                    className={`menu-item ${it.disabled ? 'disabled' : ''}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      if (it.disabled) return
                      setOpen(null)
                      it.onClick && it.onClick()
                    }}
                  >
                    <span>{it.label}</span>
                    {it.shortcut && <span className="menu-shortcut">{it.shortcut}</span>}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
