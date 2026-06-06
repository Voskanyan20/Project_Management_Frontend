import { useEffect, useState } from 'react'
import Modal, { FormField, FormActions, FormError } from '../ui/Modal'
import { createCategory, updateCategory } from '../../api'

const emptyForm = {
  name: '',
}

export default function CategoryFormModal({ open, category, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!category

  useEffect(() => {
    if (!open) return
    if (category) {
      setForm({ name: category.name || '' })
    } else {
      setForm(emptyForm)
    }
    setError('')
  }, [open, category])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.name.trim()) {
      setError('Название категории не может быть пустым')
      setLoading(false)
      return
    }

    try {
      if (isEdit) {
        await updateCategory(category.id, { name: form.name.trim() })
      } else {
        await createCategory({ name: form.name.trim() })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Не удалось сохранить категорию')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Редактировать категорию' : 'Добавить категорию'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <FormError message={error} />

        <FormField label="Название" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </FormField>

        <FormActions
          onCancel={onClose}
          submitLabel={isEdit ? 'Сохранить изменения' : 'Создать категорию'}
          loading={loading}
        />
      </form>
    </Modal>
  )
}
