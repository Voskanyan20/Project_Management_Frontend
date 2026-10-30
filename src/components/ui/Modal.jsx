import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay">
      <div
        className={`modal${wide ? ' modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="icon-btn-sm" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export function FormField({ label, children, required }) {
  return (
    <label className="form-field">
      {label}{required && ' *'}
      {children}
    </label>
  )
}

export function FormActions({ onCancel, submitLabel, loading, danger }) {
  return (
    <div className="modal-actions">
      <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
        Отмена
      </button>
      <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={loading}>
        {loading ? 'Сохранение...' : submitLabel}
      </button>
    </div>
  )
}

export function FormError({ message }) {
  if (!message) return null
  return <div className="form-error">{message}</div>
}
