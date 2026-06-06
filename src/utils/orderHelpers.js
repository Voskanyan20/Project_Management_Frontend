export function getOrderItems(order) {
  return order?.order_items ?? order?.orderItems ?? []
}

export function formatProductSummary(order) {
  const items = getOrderItems(order)
  if (items.length === 0) return 'Нет товаров'
  if (items.length === 1) {
    return items[0].product?.name || `Товар #${items[0].product_id}`
  }
  const first = items[0].product?.name || 'Товар'
  return `${first} +${items.length - 1} еще`
}

export function calculateItemsTotal(order) {
  return getOrderItems(order).reduce(
    (sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
    0
  )
}

export function sortOrdersNewestFirst(orders) {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )
}

export async function resolveCreatedOrderId(createResult, getOrdersFn) {
  if (createResult?.order?.id) return createResult.order.id
  if (createResult?.id) return createResult.id

  const orders = await getOrdersFn()
  const sorted = sortOrdersNewestFirst(orders)
  return sorted[0]?.id ?? null
}
