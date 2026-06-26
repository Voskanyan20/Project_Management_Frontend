import { useEffect, useMemo, useState } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { getOrders, getProducts } from '../api'
import Sparkline from '../components/ui/Sparkline'
import StatusBadge from '../components/ui/StatusBadge'
import ProductTypeBadge from '../components/ui/ProductTypeBadge'
import { getOrderItems, sortOrdersNewestFirst } from '../utils/orderHelpers'
import { getProductTypeLabel } from '../utils/productType'
import { formatProductDisplayName, formatCategoryName } from '../utils/productHelpers'

function getProductStatus(product) {
  if (product.stock_quantity <= 0) return 'Draft'
  if (product.stock_quantity <= product.minimum_stock) return 'Draft'
  return 'Active'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ECommerce() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getOrders(), getProducts()])
      .then(([ordersData, productsData]) => {
        setOrders(sortOrdersNewestFirst(ordersData))
        setProducts(productsData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const productIndex = Object.fromEntries(
      products.map((product) => [product.id, {
        name: formatProductDisplayName(product),
        category: formatCategoryName(product.category),
        product_type: product.product_type,
      }])
    )

    const productSales = {}
    orders.forEach((order) => {
      getOrderItems(order).forEach((item) => {
        const productId = Number(item.product_id || item.product?.id || 0)
        const productInfo = productIndex[productId] || {}
        const name = item.product
          ? formatProductDisplayName(item.product)
          : productInfo.name || `Товар #${productId}`
        const category = item.product?.category
          ? formatCategoryName(item.product.category)
          : productInfo.category || 'Общий'
        const productType = item.product?.product_type || productInfo.product_type

        if (!productSales[productId]) {
          productSales[productId] = { id: productId, name, sold: 0, revenue: 0, category, product_type: productType }
        }
        productSales[productId].sold += item.quantity || 0
        productSales[productId].revenue += Number(item.unit_price || 0) * (item.quantity || 0)
      })
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const categorySales = {}
    Object.values(productSales).forEach((p) => {
      categorySales[p.category] = (categorySales[p.category] || 0) + p.revenue
    })

    const salesByCategory = Object.entries(categorySales)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)

    const newProducts = [...products]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        if (dateA !== dateB) return dateB - dateA
        return Number(b.id) - Number(a.id)
      })
      .slice(0, 10)

    return { topProducts, salesByCategory, newProducts }
  }, [orders, products])

  if (loading) {
    return <div className="page-loading">Загрузка дашборда...</div>
  }

  return (
    <div className="ecommerce-page">
      <div className="dashboard-row">
        <div className="card table-card flex-2">
          <div className="card-header">
            <h2>Лидеры продаж</h2>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Товар</th>
                  <th>Продано</th>
                  <th>Выручка</th>
                  <th>Тренд</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">Пока нет продаж товаров</td>
                  </tr>
                ) : (
                  stats.topProducts.map((product, i) => (
                    <tr key={product.id ?? product.name}>
                      <td>{i + 1}</td>
                      <td>
                        <div className="product-cell">
                          <strong>{formatProductDisplayName(product)}</strong>
                          <span>{product.category} · {getProductTypeLabel(product.product_type)}</span>
                        </div>
                      </td>
                      <td>{product.sold}</td>
                      <td>{formatCurrency(product.revenue)}</td>
                      <td>
                        <Sparkline data={[3, 5, 4, 7, 6, 8, 9]} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card chart-card flex-1">
          <div className="card-header">
            <h2>Продажи по категориям</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.salesByCategory} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `֏${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={80} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="card table-card flex-1">
          <div className="card-header">
            <h2>Новые товары</h2>
            <p>10 последних добавленных товаров</p>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Товар</th>
                  <th>Категория</th>
                  <th>Тип закупки</th>
                  <th>Статус</th>
                  <th>Остаток</th>
                  <th>Цена</th>
                  <th>Добавлен</th>
                </tr>
              </thead>
              <tbody>
                {stats.newProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell">Пока нет товаров</td>
                  </tr>
                ) : (
                  stats.newProducts.map((product, i) => (
                    <tr key={product.id}>
                      <td>{i + 1}</td>
                      <td>
                        <div className="product-cell">
                          <strong>{formatProductDisplayName(product)}</strong>
                          <span>{product.description || 'Нет описания'}</span>
                        </div>
                      </td>
                      <td>{formatCategoryName(product.category)}</td>
                      <td><ProductTypeBadge type={product.product_type} /></td>
                      <td><StatusBadge status={getProductStatus(product)} /></td>
                      <td>{product.stock_quantity}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{formatDate(product.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
