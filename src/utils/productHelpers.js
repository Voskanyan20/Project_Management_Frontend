export function normalizeCategoryOptions(category) {
  if (!category?.options) return []

  let options = category.options
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options)
    } catch {
      return []
    }
  }

  if (!Array.isArray(options)) return []

  return options
    .map((option) => ({
      name: String(option?.name || '').trim(),
      values: Array.isArray(option?.values)
        ? option.values
            .map((value) => {
              if (typeof value === 'string') {
                const label = value.trim()
                return label ? { label, price: 0, cost_price: 0 } : null
              }
              const label = String(value?.label || '').trim()
              if (!label) return null
              const price = Number(value?.price)
              const costPrice = Number(value?.cost_price)
              return {
                label,
                price: Number.isFinite(price) ? price : 0,
                cost_price: Number.isFinite(costPrice) ? costPrice : 0,
              }
            })
            .filter(Boolean)
        : [],
    }))
    .filter((option) => option.name && option.values.length > 0)
}

export function normalizeProductOptionValues(optionValues) {
  if (!optionValues || typeof optionValues !== 'object' || Array.isArray(optionValues)) {
    return {}
  }

  return Object.entries(optionValues).reduce((acc, [key, value]) => {
    const name = String(key).trim()
    const label = String(value ?? '').trim()
    if (name && label) acc[name] = label
    return acc
  }, {})
}

export function getPricingFromCategoryOptions(categoryOptions, optionValues) {
  const options = normalizeCategoryOptions({ options: categoryOptions })
  const selected = normalizeProductOptionValues(optionValues)

  return options.reduce(
    (totals, option) => {
      const label = selected[option.name]
      if (!label) return totals

      const value = option.values.find((item) => item.label === label)
      if (!value) return totals

      return {
        price: totals.price + Number(value.price || 0),
        cost_price: totals.cost_price + Number(value.cost_price || 0),
      }
    },
    { price: 0, cost_price: 0 }
  )
}

export function formatProductOptionValues(product) {
  const values = normalizeProductOptionValues(product?.option_values)
  return Object.entries(values)
    .map(([name, label]) => `${name}: ${label}`)
    .join(', ')
}

export function formatProductOptionValueLabels(product) {
  const values = normalizeProductOptionValues(product?.option_values)
  return Object.values(values).join(', ')
}

export function formatProductDisplayName(product) {
  if (!product?.name) return ''
  const optionsText = formatProductOptionValueLabels(product)
  return optionsText ? `${product.name} — ${optionsText}` : product.name
}

export function formatCategoryOptionsSummary(category) {
  const options = normalizeCategoryOptions(category)
  if (options.length === 0) return '—'

  return options
    .flatMap((option) =>
      option.values.map((value) => {
        const price = Number(value.price || 0)
        return price > 0 ? `${value.label} (${price})` : value.label
      })
    )
    .join(', ')
}

export function buildEmptyOptionValues(category) {
  const options = normalizeCategoryOptions(category)
  return options.reduce((acc, option) => {
    acc[option.name] = option.values[0]?.label || ''
    return acc
  }, {})
}

export function validateProductOptionValues(category, optionValues) {
  const options = normalizeCategoryOptions(category)
  const selected = normalizeProductOptionValues(optionValues)

  if (options.length === 0) {
    return { valid: true, optionValues: {} }
  }

  for (const option of options) {
    const value = selected[option.name]
    if (!value) {
      return {
        valid: false,
        message: `Выберите значение для "${option.name}"`,
      }
    }

    const allowed = option.values.map((item) => item.label)
    if (!allowed.includes(value)) {
      return {
        valid: false,
        message: `Недопустимое значение "${value}" для "${option.name}"`,
      }
    }
  }

  return { valid: true, optionValues: selected }
}

export function categoryHasOptions(category) {
  return normalizeCategoryOptions(category).length > 0
}

export function getCategoryParentId(category) {
  if (!category) return null
  const parentId = category.parent_id ?? category.parent?.id ?? null
  if (parentId === null || parentId === undefined || parentId === '') return null
  const parsed = Number(parentId)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function isParentCategory(category) {
  return !getCategoryParentId(category)
}

export function isSubcategory(category) {
  return !!getCategoryParentId(category)
}

export function getParentCategories(categories) {
  return categories.filter((category) => isParentCategory(category))
}

export function getSubcategories(categories, parentId) {
  if (!parentId) return []
  return categories.filter(
    (category) => getCategoryParentId(category) === Number(parentId)
  )
}

export function formatCategoryName(category, categories = []) {
  if (!category?.name) return 'Без категории'

  const parentId = getCategoryParentId(category)
  if (!parentId) return category.name

  const parentName =
    category.parent?.name ||
    categories.find((item) => Number(item.id) === Number(parentId))?.name

  return parentName ? `${parentName} › ${category.name}` : category.name
}

export function resolveProductCategorySelection(product, categories) {
  const category = product?.category
  if (!category) {
    return { parent_category_id: '', category_id: '' }
  }

  const parentId = getCategoryParentId(category)
  if (parentId) {
    return {
      parent_category_id: String(parentId),
      category_id: String(category.id),
    }
  }

  const subcategories = getSubcategories(categories, category.id)
  if (subcategories.length > 0) {
    return {
      parent_category_id: String(category.id),
      category_id: '',
    }
  }

  return {
    parent_category_id: String(category.id),
    category_id: String(category.id),
  }
}

export function resolveSelectedProductCategory(categories, parentCategoryId, categoryId) {
  if (categoryId) {
    return categories.find((category) => String(category.id) === String(categoryId)) || null
  }

  if (parentCategoryId) {
    const parent = categories.find((category) => String(category.id) === String(parentCategoryId))
    const subcategories = getSubcategories(categories, parentCategoryId)
    if (subcategories.length === 0) return parent || null
  }

  return null
}
