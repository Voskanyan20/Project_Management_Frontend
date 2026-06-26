import { useEffect, useMemo, useState } from 'react'
import Modal, { FormField, FormActions, FormError } from '../ui/Modal'
import { createProduct, updateProduct, getCategories } from '../../api'
import { PRODUCT_TYPES, normalizeProductType } from '../../utils/productType'
import {
  normalizeCategoryOptions,
  normalizeProductOptionValues,
  getPricingFromCategoryOptions,
  buildEmptyOptionValues,
  validateProductOptionValues,
  categoryHasOptions,
  getParentCategories,
  getSubcategories,
  resolveProductCategorySelection,
  resolveSelectedProductCategory,
} from '../../utils/productHelpers'

const emptyForm = {
  name: '',
  description: '',
  cost_price: '',
  price: '',
  stock_quantity: '',
  minimum_stock: '5',
  parent_category_id: '',
  category_id: '',
  product_type: 'local',
  option_values: {},
}

export default function ProductFormModal({ open, product, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!product

  const parentCategories = useMemo(
    () => getParentCategories(categories),
    [categories]
  )

  const availableSubcategories = useMemo(
    () => getSubcategories(categories, form.parent_category_id),
    [categories, form.parent_category_id]
  )

  const requiresSubcategory = availableSubcategories.length > 0

  const selectedCategory = useMemo(
    () => resolveSelectedProductCategory(categories, form.parent_category_id, form.category_id),
    [categories, form.parent_category_id, form.category_id]
  )

  const categoryOptions = useMemo(
    () => normalizeCategoryOptions(selectedCategory),
    [selectedCategory]
  )

  const hasCategoryOptions = categoryOptions.length > 0

  useEffect(() => {
    if (open) {
      getCategories()
        .then((loadedCategories) => {
          setCategories(loadedCategories)
          if (product) {
            const selection = resolveProductCategorySelection(product, loadedCategories)
            setForm({
              name: product.name || '',
              description: product.description || '',
              cost_price: String(product.cost_price ?? ''),
              price: String(product.price ?? ''),
              stock_quantity: String(product.stock_quantity ?? ''),
              minimum_stock: String(product.minimum_stock ?? '5'),
              parent_category_id: selection.parent_category_id,
              category_id: selection.category_id,
              product_type: normalizeProductType(product.product_type),
              option_values: normalizeProductOptionValues(product.option_values),
            })
          } else {
            setForm(emptyForm)
          }
        })
        .catch(console.error)
      setError('')
    }
  }, [open, product])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const applyCategoryDefaults = (category) => {
    const nextOptionValues = categoryHasOptions(category)
      ? buildEmptyOptionValues(category)
      : {}

    const pricing = categoryHasOptions(category)
      ? getPricingFromCategoryOptions(category.options, nextOptionValues)
      : { price: 0, cost_price: 0 }

    return {
      option_values: nextOptionValues,
      price: categoryHasOptions(category) ? String(pricing.price) : '',
      cost_price: categoryHasOptions(category) ? String(pricing.cost_price) : '',
    }
  }

  const handleParentCategoryChange = (parentCategoryId) => {
    const subcategories = getSubcategories(categories, parentCategoryId)
    const parent = categories.find((category) => String(category.id) === String(parentCategoryId))

    if (subcategories.length === 0) {
      const defaults = applyCategoryDefaults(parent)
      setForm((current) => ({
        ...current,
        parent_category_id: parentCategoryId,
        category_id: parentCategoryId,
        ...defaults,
      }))
      return
    }

    setForm((current) => ({
      ...current,
      parent_category_id: parentCategoryId,
      category_id: '',
      option_values: {},
      price: '',
      cost_price: '',
    }))
  }

  const handleSubcategoryChange = (categoryId) => {
    const category = categories.find((item) => String(item.id) === String(categoryId))
    const defaults = applyCategoryDefaults(category)

    setForm((current) => ({
      ...current,
      category_id: categoryId,
      ...defaults,
    }))
  }

  const handleOptionChange = (optionName, value) => {
    const nextOptionValues = {
      ...form.option_values,
      [optionName]: value,
    }
    const pricing = getPricingFromCategoryOptions(selectedCategory?.options, nextOptionValues)

    setForm((current) => ({
      ...current,
      option_values: nextOptionValues,
      price: String(pricing.price),
      cost_price: String(pricing.cost_price),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const finalCategoryId = requiresSubcategory ? form.category_id : form.parent_category_id

    if (!finalCategoryId) {
      setError(requiresSubcategory ? 'Выберите подкategорию' : 'Выберите категорию')
      setLoading(false)
      return
    }

    const validation = validateProductOptionValues(selectedCategory, form.option_values)
    if (!validation.valid) {
      setError(validation.message)
      setLoading(false)
      return
    }

    const payload = {
      name: form.name,
      description: form.description,
      cost_price: Number(form.cost_price),
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
      minimum_stock: Number(form.minimum_stock),
      category_id: Number(finalCategoryId),
      product_type: normalizeProductType(form.product_type),
      option_values: validation.optionValues,
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
            <select
              value={form.parent_category_id}
              onChange={(e) => handleParentCategoryChange(e.target.value)}
              required
            >
              <option value="">Выберите категорию</option>
              {parentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </FormField>
          {requiresSubcategory && (
            <FormField label="Подкategория" required>
              <select
                value={form.category_id}
                onChange={(e) => handleSubcategoryChange(e.target.value)}
                required
              >
                <option value="">Выберите подкategорию</option>
                {availableSubcategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </FormField>
          )}
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

          {hasCategoryOptions && (
            <div className="product-options-fields">
              {categoryOptions.map((option) => (
                <FormField key={option.name} label={option.name} required>
                  <select
                    value={form.option_values[option.name] || ''}
                    onChange={(e) => handleOptionChange(option.name, e.target.value)}
                    required
                  >
                    <option value="">Выберите {option.name.toLowerCase()}</option>
                    {option.values.map((value) => (
                      <option key={value.label} value={value.label}>
                        {value.label} — {Number(value.price || 0).toLocaleString('hy-AM')} AMD
                      </option>
                    ))}
                  </select>
                </FormField>
              ))}
            </div>
          )}

          <FormField label="Закупочная цена" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cost_price}
              onChange={(e) => set('cost_price', e.target.value)}
              required
            />
          </FormField>
          <FormField label="Цена" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              required
            />
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
