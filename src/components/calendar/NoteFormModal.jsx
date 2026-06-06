import { useEffect, useState } from 'react'
import Modal, { FormField, FormActions, FormError } from '../ui/Modal'
import { createNote, updateNote } from '../../api'

const emptyForm = {
  title: '',
  description: '',
  deadline: '',
  is_completed: false,
}

export default function NoteFormModal({ open, note, defaultDate, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!note

  useEffect(() => {
    if (open) {
      if (note) {
        setForm({
          title: note.title || '',
          description: note.description || '',
          deadline: note.deadline?.slice(0, 10) || '',
          is_completed: !!note.is_completed,
        })
      } else {
        setForm({
          ...emptyForm,
          deadline: defaultDate || '',
        })
      }
      setError('')
    }
  }, [open, note, defaultDate])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      title: form.title,
      description: form.description,
      deadline: form.deadline,
      is_completed: form.is_completed,
    }
    try {
      if (isEdit) {
        await updateNote(note.id, payload)
      } else {
        await createNote(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Редактировать событие' : 'Добавить событие'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormError message={error} />
        <FormField label="Название" required>
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </FormField>
        <FormField label="Описание">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
        </FormField>
        <FormField label="Дата" required>
          <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} required />
        </FormField>
        {isEdit && (
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.is_completed}
              onChange={(e) => set('is_completed', e.target.checked)}
            />
            Отметить как выполненное
          </label>
        )}
        <FormActions onCancel={onClose} submitLabel={isEdit ? 'Обновить событие' : 'Сохранить событие'} loading={loading} />
      </form>
    </Modal>
  )
}
