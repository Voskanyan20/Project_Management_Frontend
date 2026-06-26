import { useEffect, useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import {
  createOrder,
  createOrderItem,
  getProducts,
  getOrders,
} from '../../api'
import { resolveCreatedOrderId, sortOrdersNewestFirst } from '../../utils/orderHelpers'
import { getProductTypeLabel } from '../../utils/productType'
import { formatProductDisplayName } from '../../utils/productHelpers'

function formatMoney(value) {
  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
  }).format(Number(value || 0))
}

export default function SalesModal({ open, onClose, onSaved }) {
  const [products, setProducts] = useState([])
  const [lineItems, setLineItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Pending')

  useEffect(() => {
    if (open) {
      setError('')
      setLineItems([])
      setStatus('Pending')
      getProducts()
        .then(setProducts)
        .catch((err) => setError('Не удалось загрузить товары'))
    }
  }, [open])

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { product_id: '', quantity: 1, unit_price: 0, tempId: Date.now() },
    ])
  }

  const removeLineItem = (tempId) => {
    setLineItems(lineItems.filter((item) => item.tempId !== tempId))
  }

  const updateLineItem = (tempId, field, value) => {
    setLineItems(
      lineItems.map((item) =>
        item.tempId === tempId ? { ...item, [field]: value } : item
      )
    )
  }

  const getProductById = (id) => {
    return products.find((p) => String(p.id) === String(id))
  }

  const handleProductChange = (tempId, productId) => {
    const product = getProductById(productId)
    setLineItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              product_id: String(productId),
              unit_price: product ? product.price || 0 : item.unit_price,
            }
          : item
      )
    )
  }

  const calculateItemSubtotal = (item) => {
    return Number(item.unit_price || 0) * Number(item.quantity || 0)
  }

  const calculateTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (lineItems.length === 0) {
      setError('Добавьте хотя бы один товар')
      return
    }

    let hasInvalid = false
    const validItems = lineItems.filter((item) => {
      if (item.product_id === '' || item.product_id == null) {
        setError('Выберите товар для всех строк')
        hasInvalid = true
        return false
      }
      if (!item.quantity || item.quantity <= 0) {
        setError('Количество должно быть больше 0')
        hasInvalid = true
        return false
      }
      const product = getProductById(item.product_id)
      if (product && Number(product.stock_quantity) < item.quantity) {
        setError(`Недостаточно товара "${formatProductDisplayName(product)}" на складе. Доступно: ${product.stock_quantity}`)
        hasInvalid = true
        return false
      }
      return true
    })

    if (hasInvalid || validItems.length !== lineItems.length) return

    if (validItems.length !== lineItems.length) return

    setLoading(true)

    try {
      const totalAmount = calculateTotalAmount()

      const createRes = await createOrder({
        total_amount: totalAmount,
        status,
      })

      let orderId = createRes?.order?.id

      if (!orderId) {
        const orders = await getOrders()
        const newest = sortOrdersNewestFirst(orders)[0]
        if (!newest) throw new Error('Не удалось получить ID заказа')
        orderId = newest.id
      }

      await Promise.all(
        validItems.map((item) =>
          createOrderItem({
            order_id: orderId,
            product_id: Number(item.product_id),
            quantity: item.quantity,
            unit_price: item.unit_price,
          })
        )
      )

      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Не удалось создать продажу')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const totalAmount = calculateTotalAmount()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать продажу</h2>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label>Статус заказа</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                <option value="Pending">Ожидает</option>
                <option value="Completed">Завершено</option>
                <option value="Cancelled">Отменено</option>
              </select>
            </div>

            <div className="sales-items-section">
              <div className="section-header">
                <h3>Товары</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={addLineItem}
                  disabled={loading}
                >
                  <Plus size={16} /> Добавить товар
                </button>
              </div>

              {lineItems.length === 0 ? (
                <div className="empty-state">
                  Нажмите "Добавить товар" для создания строк продажи
                </div>
              ) : (
                <div className="sales-items-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>Количество</th>
                        <th>Цена за единицу</th>
                        <th>Подитог</th>
                        <th style={{ width: '40px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.tempId}>
                          <td data-label="Товар">
                            <select
                              value={item.product_id}
                              onChange={(e) =>
                                handleProductChange(item.tempId, e.target.value)
                              }
                              disabled={loading}
                              required
                            >
                              <option value="">Выберите товар</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {formatProductDisplayName(p)} ({getProductTypeLabel(p.product_type)}, запас: {p.stock_quantity})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td data-label="Количество">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(
                                  item.tempId,
                                  'quantity',
                                  e.target.value === '' ? '' : parseInt(e.target.value)
                                )
                              }
                              onBlur={(e) => {
                                if (!e.target.value || e.target.value === '0') {
                                  updateLineItem(item.tempId, 'quantity', 1)
                                }
                              }}
                              disabled={loading}
                            />
                          </td>
                          <td data-label="Цена за единицу">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateLineItem(
                                  item.tempId,
                                  'unit_price',
                                  e.target.value === '' ? '' : parseFloat(e.target.value)
                                )
                              }
                              onBlur={(e) => {
                                if (!e.target.value || e.target.value === '0') {
                                  updateLineItem(item.tempId, 'unit_price', 0)
                                }
                              }}
                              disabled={loading}
                            />
                          </td>
                          <td data-label="Подитог" className="numeric">
                            {formatMoney(calculateItemSubtotal(item))}
                          </td>
                          <td data-label="Удалить">
                            <button
                              type="button"
                              className="btn-icon danger"
                              onClick={() => removeLineItem(item.tempId)}
                              disabled={loading}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sales-total">
              <span className="total-label">Итого:</span>
              <span className="total-amount">{formatMoney(totalAmount)}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Создание...' : 'Создать продажу'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #333;
        }

        .sales-items-section {
          margin-top: 20px;
          margin-bottom: 20px;
        }

        .sales-items-table {
          overflow-x: auto;
          border: 1px solid #ddd;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .sales-items-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .sales-items-table th {
          background: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 0.875rem;
          color: #333;
          border-bottom: 1px solid #ddd;
        }

        .sales-items-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        .sales-items-table select,
        .sales-items-table input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .sales-items-table select:disabled,
        .sales-items-table input:disabled {
          background: #f5f5f5;
          color: #999;
        }

        .numeric {
          text-align: right;
          font-family: 'Monaco', 'Courier New', monospace;
          font-weight: 500;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .btn-icon.danger {
          color: #d32f2f;
        }

        .btn-icon.danger:hover:not(:disabled) {
          background: #ffebee;
        }

        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          padding: 24px;
          text-align: center;
          color: #999;
          background: #fafafa;
          border-radius: 6px;
        }

        .sales-total {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 6px;
          margin-top: 16px;
        }

        .total-label {
          font-weight: 600;
          font-size: 1rem;
          color: #333;
        }

        .total-amount {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1976d2;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .form-error {
          padding: 12px;
          background: #ffebee;
          color: #c62828;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 0.9rem;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #333;
          font-size: 0.9rem;
        }

        .form-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .modal {
          width: min(100%, 1080px);
          max-width: 1080px;
          max-height: calc(100vh - 64px);
          margin: 16px auto;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .modal-body {
          padding: 24px;
          overflow: auto;
          flex: 1;
          min-height: 0;
        }

        .modal-header,
        .modal-footer {
          padding: 20px 24px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
          background: #fafafa;
          border-top: 1px solid #eee;
        }

        .sales-items-table th,
        .sales-items-table td {
          min-width: 110px;
        }

        @media (max-width: 950px) {
          .modal {
            width: min(100%, 100%);
            margin: 12px auto;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
          }

          .sales-total {
            justify-content: space-between;
            flex-wrap: wrap;
          }
        }

        @media (max-width: 760px) {
          .modal {
            width: 100%;
            margin: 8px 0;
            max-height: calc(100vh - 16px);
          }

          .modal-header,
          .modal-footer,
          .modal-body {
            padding: 16px;
          }

          .modal-header h2 {
            font-size: 1.25rem;
          }

          .sales-items-table {
            border: none;
          }

          .sales-items-table table,
          .sales-items-table thead,
          .sales-items-table tbody,
          .sales-items-table th,
          .sales-items-table td,
          .sales-items-table tr {
            display: block;
          }

          .sales-items-table thead tr {
            position: absolute;
            top: -9999px;
            left: -9999px;
          }

          .sales-items-table tr {
            border: 1px solid #ddd;
            border-radius: 10px;
            margin-bottom: 12px;
            background: #fff;
          }

          .sales-items-table td {
            border: none;
            border-bottom: 1px solid #eee;
            position: relative;
            padding-left: 50%;
            white-space: normal;
          }

          .sales-items-table td:last-child {
            border-bottom: none;
          }

          .sales-items-table td:before {
            position: absolute;
            top: 12px;
            left: 16px;
            width: 45%;
            padding-right: 10px;
            white-space: nowrap;
            font-weight: 600;
            color: #555;
            content: attr(data-label);
          }

          .sales-items-table select,
          .sales-items-table input {
            width: 100%;
            padding: 10px;
            font-size: 16px;
          }

          .sales-total {
            flex-direction: column;
            align-items: flex-start;
          }

          .total-amount {
            font-size: 1.25rem;
          }

          .btn {
            padding: 10px 16px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .modal {
            margin: 0;
            max-height: 100vh;
            border-radius: 0;
          }

          .modal-header,
          .modal-footer,
          .modal-body {
            padding: 12px;
          }

          .modal-header h2 {
            font-size: 1.1rem;
          }

          .section-header h3 {
            font-size: 0.9rem;
          }

          .sales-items-table tr {
            margin-bottom: 10px;
          }

          .sales-items-table td {
            padding-left: 45%;
            padding-top: 8px;
            padding-bottom: 8px;
          }

          .sales-items-table td:before {
            font-size: 0.85rem;
            left: 12px;
            width: 40%;
          }

          .sales-items-table select,
          .sales-items-table input {
            padding: 8px;
            font-size: 14px;
          }

          .sales-total {
            padding: 12px;
          }

          .total-label {
            font-size: 0.9rem;
          }

          .total-amount {
            font-size: 1.1rem;
          }

          .modal-footer {
            flex-direction: column;
            gap: 8px;
          }

          .modal-footer .btn {
            width: 100%;
          }

          .form-group label {
            font-size: 0.85rem;
          }

          .form-group select {
            padding: 8px;
            font-size: 14px;
          }
        }

        @media (max-width: 360px) {
          .modal {
            margin: 0;
            max-height: 100vh;
            border-radius: 0;
          }

          .modal-header,
          .modal-footer,
          .modal-body {
            padding: 10px;
          }

          .modal-header h2 {
            font-size: 1rem;
          }

          .modal-close {
            padding: 4px;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .section-header h3 {
            font-size: 0.85rem;
          }

          .section-header .btn {
            font-size: 0.85rem;
            padding: 8px 12px;
          }

          .form-group {
            margin-bottom: 12px;
          }

          .form-group label {
            font-size: 0.8rem;
            margin-bottom: 4px;
          }

          .form-group select {
            padding: 8px;
            font-size: 13px;
          }

          .sales-items-section {
            margin-top: 16px;
            margin-bottom: 16px;
          }

          .sales-items-table tr {
            margin-bottom: 8px;
            border-radius: 8px;
          }

          .sales-items-table td {
            padding-left: 42%;
            padding-top: 6px;
            padding-bottom: 6px;
          }

          .sales-items-table td:before {
            font-size: 0.8rem;
            left: 10px;
            width: 38%;
            top: 8px;
          }

          .sales-items-table select,
          .sales-items-table input {
            padding: 6px;
            font-size: 13px;
          }

          .btn-icon {
            padding: 6px;
          }

          .sales-total {
            padding: 10px;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .total-label {
            font-size: 0.85rem;
          }

          .total-amount {
            font-size: 1rem;
          }

          .modal-footer {
            padding: 10px;
            gap: 6px;
          }

          .modal-footer .btn {
            padding: 10px;
            font-size: 13px;
          }

          .form-error {
            padding: 10px;
            font-size: 0.85rem;
          }

          .empty-state {
            padding: 16px;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  )
}
