import { X } from 'lucide-react'
import { getOrderItems } from '../../utils/orderHelpers'
import ProductTypeBadge from '../ui/ProductTypeBadge'

function formatMoney(value) {
  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
  }).format(Number(value || 0))
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrderDetailsModal({ open, order, onClose }) {
  if (!open || !order) return null

  const items = getOrderItems(order)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Детали заказа ORD-{String(order.id).padStart(4, '0')}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="order-details-grid">
            <div className="detail-item">
              <span className="detail-label">Статус</span>
              <span className="detail-value">{order.status}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Дата создания</span>
              <span className="detail-value">{formatDate(order.createdAt)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Итоговая сумма</span>
              <span className="detail-value">{formatMoney(order.total_amount)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Товаров</span>
              <span className="detail-value">{items.length}</span>
            </div>
          </div>

          <div className="order-items-section">
            <h3>Товары в заказе</h3>
            {items.length === 0 ? (
              <div className="empty-state">Нет товаров в заказе</div>
            ) : (
              <div className="order-items-table">
                <table>
                  <thead>
                    <tr>
                      <th>Название товара</th>
                      <th>Тип закупки</th>
                      <th>Количество</th>
                      <th>Цена за единицу</th>
                      <th>Подитог</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const subtotal = Number(item.unit_price || 0) * Number(item.quantity || 0)
                      return (
                        <tr key={item.id || idx}>
                          <td className="product-name">{item.product?.name || `Товар #${item.product_id}`}</td>
                          <td><ProductTypeBadge type={item.product?.product_type} /></td>
                          <td className="numeric">{item.quantity}</td>
                          <td className="numeric">{formatMoney(item.unit_price)}</td>
                          <td className="numeric">{formatMoney(subtotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>

      <style>{`
        .order-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .detail-label {
          font-size: 0.875rem;
          color: #666;
          font-weight: 500;
        }
        
        .detail-value {
          font-size: 1rem;
          color: #000;
          font-weight: 600;
        }
        
        .order-items-section {
          margin-top: 24px;
        }
        
        .order-items-section h3 {
          margin-bottom: 12px;
          font-size: 1rem;
          color: #333;
        }
        
        .order-items-table {
          overflow-x: auto;
          border: 1px solid #ddd;
          border-radius: 6px;
        }
        
        .order-items-table table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .order-items-table th {
          background: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 0.875rem;
          color: #333;
          border-bottom: 1px solid #ddd;
        }
        
        .order-items-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          font-size: 0.9rem;
        }
        
        .order-items-table tr:last-child td {
          border-bottom: none;
        }
        
        .product-name {
          font-weight: 500;
          color: #333;
        }
        
        .numeric {
          text-align: right;
          font-family: 'Monaco', 'Courier New', monospace;
        }
        
        .empty-state {
          padding: 24px;
          text-align: center;
          color: #999;
          background: #fafafa;
          border-radius: 6px;
        }
      `}</style>
    </div>
  )
}
