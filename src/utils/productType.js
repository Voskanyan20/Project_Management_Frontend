export const PRODUCT_TYPES = [
  { value: 'online', label: 'Онлайн закуп' },
  { value: 'local', label: 'Внутри страны' },
]

export function normalizeProductType(value) {
  return value === 'online' ? 'online' : 'local'
}

export function getProductTypeLabel(value) {
  const type = normalizeProductType(value)
  return PRODUCT_TYPES.find((item) => item.value === type)?.label || 'Внутри страны'
}

export function formatProductWithType(product) {
  if (!product?.name) return ''
  const typeLabel = getProductTypeLabel(product.product_type)
  return `${product.name} (${typeLabel})`
}
