import { useEffect, useRef, useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'

export default function ActionsMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const dropdownRef = useRef(null)
  const [dropdownStyle, setDropdownStyle] = useState({})

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open || !ref.current) return

    const buttonRect = ref.current.getBoundingClientRect()
    const dropdownWidth = 150
    const dropdownHeight = 100
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = buttonRect.right - dropdownWidth
    let top = buttonRect.bottom + 4

    if (left < 0) left = 8
    if (left + dropdownWidth > viewportWidth) left = viewportWidth - dropdownWidth - 8
    if (top + dropdownHeight > viewportHeight) top = buttonRect.top - dropdownHeight - 4

    setDropdownStyle({
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 1000
    })
  }, [open])

  return (
    <div className="actions-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn-sm"
        aria-label="Действия"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="actions-dropdown" ref={dropdownRef} style={dropdownStyle}>
          <button type="button" onClick={() => { setOpen(false); onEdit() }}>
            <Edit size={14} /> Редактировать
          </button>
          <button type="button" className="danger" onClick={() => { setOpen(false); onDelete() }}>
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      )}
    </div>
  )
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null

  return (
    <div className="modal-overlay">
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
            Отмена
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  )
}
