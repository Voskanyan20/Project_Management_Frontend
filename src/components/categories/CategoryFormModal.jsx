import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal, { FormField, FormActions, FormError } from '../ui/Modal'
import { createCategory, updateCategory } from '../../api'
import { normalizeCategoryOptions } from '../../utils/productHelpers'

const emptyOptionValue = () => ({ label: '', price: '', cost_price: '' })
const emptyOptionGroup = () => ({ name: '', values: [emptyOptionValue()] })

const emptyForm = {
  name: '',
  options: [],
}

function buildFormFromCategory(category) {
  const options = normalizeCategoryOptions(category).map((option) => ({
    name: option.name,
    values: option.values.map((value) => ({
      label: value.label,
      price: String(value.price ?? ''),
      cost_price: String(value.cost_price ?? ''),
    })),
  }))

  return {
    name: category?.name || '',
    options,
  }
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    options: form.options
      .map((option) => ({
        name: option.name.trim(),
        values: option.values
          .map((value) => ({
            label: value.label.trim(),
            price: Number(value.price) || 0,
            cost_price: Number(value.cost_price) || 0,
          }))
          .filter((value) => value.label),
      }))
      .filter((option) => option.name && option.values.length > 0),
  }
}

export default function CategoryFormModal({ open, category, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!category

  useEffect(() => {
    if (!open) return
    if (category) {
      setForm(buildFormFromCategory(category))
    } else {
      setForm(emptyForm)
    }
    setError('')
  }, [open, category])

  const setName = (value) => setForm((current) => ({ ...current, name: value }))

  const addOptionGroup = () => {
    setForm((current) => ({
      ...current,
      options: [...current.options, emptyOptionGroup()],
    }))
  }

  const removeOptionGroup = (groupIndex) => {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_, index) => index !== groupIndex),
    }))
  }

  const updateOptionGroup = (groupIndex, key, value) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, index) =>
        index === groupIndex ? { ...option, [key]: value } : option
      ),
    }))
  }

  const addOptionValue = (groupIndex) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, index) =>
        index === groupIndex
          ? { ...option, values: [...option.values, emptyOptionValue()] }
          : option
      ),
    }))
  }

  const removeOptionValue = (groupIndex, valueIndex) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, index) => {
        if (index !== groupIndex) return option
        const values = option.values.filter((_, idx) => idx !== valueIndex)
        return { ...option, values: values.length > 0 ? values : [emptyOptionValue()] }
      }),
    }))
  }

  const updateOptionValue = (groupIndex, valueIndex, key, value) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, index) => {
        if (index !== groupIndex) return option
        return {
          ...option,
          values: option.values.map((item, idx) =>
            idx === valueIndex ? { ...item, [key]: value } : item
          ),
        }
      }),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.name.trim()) {
      setError('Название категории не может быть пустым')
      setLoading(false)
      return
    }

    const payload = buildPayload(form)

    try {
      if (isEdit) {
        await updateCategory(category.id, payload)
      } else {
        await createCategory(payload)
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
      wide
    >
      <form onSubmit={handleSubmit}>
        <FormError message={error} />

        <FormField label="Название" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>

        <div className="category-options-section">
          <div className="category-options-header">
            <div>
              <h3>Опции товара</h3>
              <p>Задайте варианты с отдельной ценой для каждого значения.</p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addOptionGroup}>
              <Plus size={14} />
              Добавить опцию
            </button>
          </div>

          {form.options.length === 0 ? (
            <p className="category-options-empty">Опции не заданы. Товары будут использовать обычную цену.</p>
          ) : (
            form.options.map((option, groupIndex) => (
              <div key={groupIndex} className="category-option-group">
                <div className="category-option-group-header">
                  <FormField label="Название опции" required>
                    <input
                      type="text"
                      value={option.name}
                      onChange={(e) => updateOptionGroup(groupIndex, 'name', e.target.value)}
                      placeholder="Например: Ёмкость"
                      required
                    />
                  </FormField>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => removeOptionGroup(groupIndex)}
                    aria-label="Удалить опцию"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="category-option-values">
                  <div className="category-option-values-head">
                    <span>Значение</span>
                    <span>Цена продажи</span>
                    <span>Закупочная цена</span>
                    <span />
                  </div>
                  {option.values.map((value, valueIndex) => (
                    <div key={valueIndex} className="category-option-value-row">
                      <input
                        type="text"
                        value={value.label}
                        onChange={(e) => updateOptionValue(groupIndex, valueIndex, 'label', e.target.value)}
                        placeholder="1000mAh"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={value.price}
                        onChange={(e) => updateOptionValue(groupIndex, valueIndex, 'price', e.target.value)}
                        placeholder="0"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={value.cost_price}
                        onChange={(e) => updateOptionValue(groupIndex, valueIndex, 'cost_price', e.target.value)}
                        placeholder="0"
                      />
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => removeOptionValue(groupIndex, valueIndex)}
                        aria-label="Удалить значение"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addOptionValue(groupIndex)}
                >
                  <Plus size={14} />
                  Добавить значение
                </button>
              </div>
            ))
          )}
        </div>

        <FormActions
          onCancel={onClose}
          submitLabel={isEdit ? 'Сохранить изменения' : 'Создать категорию'}
          loading={loading}
        />
      </form>
    </Modal>
  )
}
