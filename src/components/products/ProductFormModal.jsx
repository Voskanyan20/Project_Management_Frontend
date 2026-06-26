import { useEffect, useState } from 'react'
import Modal, { FormField, FormActions, FormError } from '../ui/Modal'
import { createProduct, updateProduct, getCategories } from '../../api'
import { PRODUCT_TYPES, normalizeProductType } from '../../utils/productType'

const emptyForm = {
  name: '',
  description: '',
  cost_price: '',
  price: '',
  stock_quantity: '',
  minimum_stock: '5',
  category_id: '',
  product_type: 'local',
}

export default function ProductFormModal({ open, product, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!product

  useEffect(() => {
    if (open) {
      getCategories().then(setCategories).catch(console.error)
      if (product) {
        setForm({
          name: product.name || '',
          description: product.description || '',
          cost_price: String(product.cost_price ?? ''),
          price: String(product.price ?? ''),
          stock_quantity: String(product.stock_quantity ?? ''),
          minimum_stock: String(product.minimum_stock ?? '5'),
          category_id: String(product.category_id ?? product.category?.id ?? ''),
          product_type: normalizeProductType(product.product_type),
        })
      } else {
        setForm(emptyForm)
      }
      setError('')
    }
  }, [open, product])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      name: form.name,
      description: form.description,
      cost_price: Number(form.cost_price),
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
      minimum_stock: Number(form.minimum_stock),
      category_id: Number(form.category_id),
      product_type: normalizeProductType(form.product_type),
    }
    try {
      if (isEdit) {
        await updateProduct(product.id, payload)
      } else {
        await createProduct(payload)
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
    <Modal open={open} title={isEdit ? 'Редактировать товар' : 'Добавить товар'} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <FormError message={error} />
        <div className="form-grid">
          <FormField label="Название" required>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </FormField>
          <FormField label="Категория" required>
            <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} required>
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Тип закупки" required>
            <select value={form.product_type} onChange={(e) => set('product_type', e.target.value)} required>
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Описание">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
          </FormField>
          <FormField label="Закупочная цена" required>
            <input type="number" step="0.01" min="0" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} required />
          </FormField>
          <FormField label="Цена" required>
            <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} required />
          </FormField>
          <FormField label="Количество на складе" required>
            <input type="number" min="0" value={form.stock_quantity} onChange={(e) => set('stock_quantity', e.target.value)} required />
          </FormField>
          <FormField label="Минимальный остаток" required>
            <input type="number" min="0" value={form.minimum_stock} onChange={(e) => set('minimum_stock', e.target.value)} required />
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitLabel={isEdit ? 'Обновить товар' : 'Создать товар'} loading={loading} />
      </form>
    </Modal>
  )
}
