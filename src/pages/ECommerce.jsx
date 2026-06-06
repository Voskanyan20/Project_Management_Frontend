import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  Calendar,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { getOrders, getProducts } from '../api'
import Sparkline from '../components/ui/Sparkline'
import { getOrderItems, sortOrdersNewestFirst } from '../utils/orderHelpers'

const STATUS_COLORS = {
  Completed: '#10b981',
  Processing: '#0ea5e9',
  Pending: '#f59e0b',
  Cancelled: '#ef4444',
}

const STATUS_LABELS = {
  Completed: 'Завершено',
  Processing: 'В обработке',
  Pending: 'Ожидают',
  Cancelled: 'Отменено',
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

const CHART_MODES = [
  { value: 'Revenue', label: 'Доход' },
  { value: 'Orders', label: 'Заказы' },
  { value: 'Profit', label: 'Прибыль' },
]

function formatCurrency(value) {
  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function KpiCard({ title, value, change, positive, icon: Icon, iconColor, sparkData }) {
  const isPositive = positive ?? change.startsWith('+')
  return (
    <div className="card kpi-card">
      <div className="kpi-top">
        <div>
          <p className="kpi-label">{title}</p>
          <p className="kpi-value">{value}</p>
          <span className={`kpi-change${isPositive ? ' up' : ' down'}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}
          </span>
        </div>
        <div className="kpi-icon" style={{ background: `${iconColor}18`, color: iconColor }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="kpi-spark">
        <svg viewBox="0 0 120 24" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={iconColor}
            strokeWidth="2"
            points={sparkData
              .map((v, i) => `${(i / (sparkData.length - 1)) * 120},${24 - v * 0.8}`)
              .join(' ')}
          />
        </svg>
      </div>
    </div>
  )
}

export default function ECommerce() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [chartMode, setChartMode] = useState('Revenue')
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
    const totalSales = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    const completed = orders.filter((o) => o.status === 'Completed')
    const cancelled = orders.filter((o) => o.status === 'Cancelled')
    const avgOrder = orders.length ? totalSales / orders.length : 0
    const refundRate = orders.length ? (cancelled.length / orders.length) * 100 : 0

    const statusCounts = {
      Completed: completed.length,
      Processing: Math.floor(orders.filter((o) => o.status === 'Pending').length * 0.4),
      Pending: orders.filter((o) => o.status === 'Pending').length,
      Cancelled: cancelled.length,
    }

    const productIndex = Object.fromEntries(
      products.map((product) => [product.id, {
        name: product.name,
        category: product.category?.name || 'Общий',
      }])
    )

    const productSales = {}
    orders.forEach((order) => {
      getOrderItems(order).forEach((item) => {
        const productId = Number(item.product_id || item.product?.id || 0)
        const productInfo = productIndex[productId] || {}
        const name = item.product?.name || productInfo.name || `Товар #${productId}`
        const category = item.product?.category?.name || productInfo.category || 'Общий'

        if (!productSales[productId]) {
          productSales[productId] = { id: productId, name, sold: 0, revenue: 0, category }
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

    const monthlyData = MONTHS.map((month, i) => {
      const monthOrders = orders.filter((o) => {
        const d = new Date(o.createdAt || Date.now())
        return d.getMonth() === i
      })
      return {
        month,
        revenue: monthOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
        orders: monthOrders.length,
        profit: monthOrders.reduce((s, o) => s + Number(o.total_amount || 0) * 0.35, 0),
      }
    })

    return {
      totalSales,
      avgOrder,
      refundRate,
      statusCounts,
      topProducts,
      salesByCategory,
      monthlyData,
      orderTotal: orders.length,
    }
  }, [orders, products])

  const donutData = [
    { name: 'Completed', value: stats.statusCounts.Completed, color: STATUS_COLORS.Completed },
    { name: 'Processing', value: stats.statusCounts.Processing, color: STATUS_COLORS.Processing },
    { name: 'Pending', value: stats.statusCounts.Pending, color: STATUS_COLORS.Pending },
    { name: 'Cancelled', value: stats.statusCounts.Cancelled, color: STATUS_COLORS.Cancelled },
  ].filter((d) => d.value > 0)

  const chartKey = chartMode === 'Revenue' ? 'revenue' : chartMode === 'Orders' ? 'orders' : 'profit'
  const chartModeLabel = CHART_MODES.find((mode) => mode.value === chartMode)?.label || chartMode

  if (loading) {
    return <div className="page-loading">Загрузка дашборда...</div>
  }

  return (
    <div className="ecommerce-page">
      <div className="kpi-grid">
        <KpiCard
          title="Общие продажи"
          value={formatCurrency(stats.totalSales)}
          change="+12.2%"
          icon={TrendingUp}
          iconColor="#10b981"
          sparkData={[20, 35, 28, 45, 38, 52, 48, 60, 55, 70, 65, 80]}
        />
        <KpiCard
          title="Средний чек"
          value={formatCurrency(stats.avgOrder)}
          change="+4.5%"
          icon={Calendar}
          iconColor="#14b8a6"
          sparkData={[30, 32, 31, 34, 33, 36, 35, 38, 37, 40, 39, 42]}
        />
        <KpiCard
          title="Конверсия"
          value={`${products.length ? ((stats.statusCounts.Completed / Math.max(stats.orderTotal, 1)) * 100).toFixed(2) : '0.00'}%`}
          change="+0.3%"
          icon={TrendingUp}
          iconColor="#3b82f6"
          sparkData={[10, 12, 11, 13, 14, 13, 15, 16, 15, 17, 18, 19]}
        />
        <KpiCard
          title="Процент возвратов"
          value={`${stats.refundRate.toFixed(1)}%`}
          change="-0.2%"
          positive={false}
          icon={RefreshCw}
          iconColor="#f97316"
          sparkData={[8, 7, 8, 6, 7, 5, 6, 4, 5, 3, 4, 2]}
        />
      </div>

      <div className="dashboard-row">
        <div className="card chart-card flex-2">
          <div className="card-header">
            <div>
              <h2>Обзор продаж</h2>
              <p>Ежемесячная динамика магазина</p>
            </div>
            <div className="chart-toggle">
              {CHART_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={`toggle-btn${chartMode === mode.value ? ' active' : ''}`}
                  onClick={() => setChartMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.monthlyData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                formatter={(val) => [chartMode === 'Orders' ? val : formatCurrency(val), chartModeLabel]}
              />
              <Area
                type="monotone"
                dataKey={chartKey}
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card flex-1">
          <div className="card-header">
            <h2>Статус заказов</h2>
          </div>
          <div className="donut-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData.length ? donutData : [{ name: 'Нет заказов', value: 1, color: '#e5e7eb' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(donutData.length ? donutData : [{ color: '#e5e7eb' }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{stats.orderTotal}</strong>
              <span>Заказы</span>
            </div>
          </div>
          <div className="donut-legend">
            {donutData.map((item) => (
              <div key={item.name} className="legend-item">
                <span className="legend-dot" style={{ background: item.color }} />
                <span className="legend-label">{STATUS_LABELS[item.name] || item.name}</span>
                <span className="legend-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                          <strong>{product.name}</strong>
                          <span>{product.category}</span>
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
    </div>
  )
}
