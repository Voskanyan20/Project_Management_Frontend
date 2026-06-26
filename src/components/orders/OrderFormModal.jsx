import { useEffect, useMemo, useState } from 'react'
import Modal, { FormField, FormActions, FormError } from '../ui/Modal'
import {
  createOrder,
  updateOrder,
  deleteOrder,
  getProducts,
  getOrders,
  createOrderItem,
} from '../../api'
import {
  getOrderItems,
  calculateItemsTotal,
  resolveCreatedOrderId,
} from '../../utils/orderHelpers'
import { getProductTypeLabel } from '../../utils/productType'

const ORDER_STATUSES = [
  { value: 'Pending', label: 'Ожидает' },
  { value: 'Completed', label: 'Завершено' },
  { value: 'Cancelled', label: 'Отменено' },
]

const emptyForm = {
  status: 'Pending',
  product_id: '',
  quantity: '1',
  total_amount: '',
}

function formatMoney(value) {
  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default function OrderFormModal({ open, order, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!order

  const orderItems = useMemo(() => (order ? getOrderItems(order) : []), [order])

  useEffect(() => {
    if (open) {
      getProducts().then(setProducts).catch(console.error)
      if (order) {
        const itemsTotal = calculateItemsTotal(order)
        setForm({
          status: order.status || 'Pending',
          product_id: '',
          quantity: '1',
          total_amount: String(order.total_amount ?? itemsTotal),
        })
      } else {
        setForm(emptyForm)
      }
      setError('')
    }
  }, [open, order])

  const availableProducts = useMemo(
    () => products.filter((p) => Number(p.stock_quantity) > 0),
    [products]
  )

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === Number(form.product_id)),
    [products, form.product_id]
  )

  const computedTotal = useMemo(() => {
    if (isEdit) return Number(form.total_amount || 0)
    if (!selectedProduct) return 0
    return Number(selectedProduct.price) * Number(form.quantity || 0)
  }, [isEdit, form.total_amount, selectedProduct, form.quantity])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isEdit) {
        const total = Number(form.total_amount)
        if (Number.isNaN(total) || total < 0) {
          throw new Error('Итоговая сумма должна быть корректным числом')
        }
        await updateOrder(order.id, {
          total_amount: total,
          status: form.status,
        })
      } else {
        if (!form.product_id) throw new Error('Пожалуйста, выберите товар')
        const product = products.find((p) => p.id === Number(form.product_id))
        if (!product) throw new Error('Товар не найден')

        const qty = Number(form.quantity)
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error('Количество должно быть целым числом больше 0')
        }
        if (Number(product.stock_quantity) < qty) {
          throw new Error(`Недостаточно товара на складе. Доступно: ${product.stock_quantity}`)
        }

        const total = Number(product.price) * qty
        const result = await createOrder({ total_amount: total, status: form.status })
        const orderId = await resolveCreatedOrderId(result, getOrders)

        if (!orderId) {
          throw new Error('Заказ создан, но не удалось связать его с товаром')
        }

        try {
          await createOrderItem({
            order_id: orderId,
            product_id: Number(form.product_id),
            quantity: qty,
            unit_price: Number(product.price),
          })
        } catch (itemErr) {
          await deleteOrder(orderId).catch(() => {})
          throw new Error(itemErr.message || 'Не удалось добавить товар в заказ')
        }
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
    <Modal open={open} title={isEdit ? 'Редактировать заказ' : 'Новый заказ'} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <FormError message={error} />

        {isEdit && (
          <div className="order-items-preview">
            <p className="preview-label">Товары заказа</p>
            {orderItems.length === 0 ? (
              <p className="preview-empty">Нет товаров в этом заказе.</p>
            ) : (
              <ul className="preview-list">
                {orderItems.map((item) => (
                  <li key={item.id}>
                    <span>{item.product?.name || `Товар #${item.product_id}`}</span>
                    <span>
                      {item.quantity} × {formatMoney(item.unit_price)} = {formatMoney(Number(item.unit_price) * Number(item.quantity))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {orderItems.length > 0 && (
              <p className="preview-subtotal">
                Сумма товаров: {formatMoney(calculateItemsTotal(order))}
              </p>
            )}
          </div>
        )}

        {!isEdit && (
          <>
            <FormField label="Товар" required>
              <select
                value={form.product_id}
                onChange={(e) => set('product_id', e.target.value)}
                required
              >
                <option value="">Выберите товар</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {getProductTypeLabel(p.product_type)} — {formatMoney(p.price)} (в наличии: {p.stock_quantity})
                  </option>
                ))}
              </select>
              {products.length > 0 && availableProducts.length === 0 && (
                <span className="field-hint">Все товары отсутствуют на складе.</span>
              )}
            </FormField>
            <FormField label="Количество" required>
              <input
                type="number"
                min="1"
                max={selectedProduct?.stock_quantity || undefined}
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                required
              />
            </FormField>
          </>
        )}

        <FormField label="Статус" required>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} required>
            {ORDER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </FormField>

        {isEdit ? (
          <FormField label="Итоговая сумма" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.total_amount}
              onChange={(e) => set('total_amount', e.target.value)}
              required
            />
          </FormField>
        ) : (
          <div className="form-summary">
            <span>Итоговая сумма</span>
            <strong>{formatMoney(computedTotal)}</strong>
          </div>
        )}

        <FormActions
          onCancel={onClose}
          submitLabel={isEdit ? 'Обновить заказ' : 'Создать заказ'}
          loading={loading}
        />
      </form>
    </Modal>
  )
}
