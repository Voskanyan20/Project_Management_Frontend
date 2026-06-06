import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Eye } from 'lucide-react'
import { getOrders, deleteOrder } from '../api'
import StatusBadge from '../components/ui/StatusBadge'
import Sparkline from '../components/ui/Sparkline'
import ActionsMenu, { ConfirmDialog } from '../components/ui/ActionsMenu'
import OrderFormModal from '../components/orders/OrderFormModal'
import OrderDetailsModal from '../components/orders/OrderDetailsModal'
import SalesModal from '../components/orders/SalesModal'
import Pagination, {
  PageHeader,
  FilterTabs,
  TableToolbar,
  ToolbarButton,
} from '../components/ui/TableHelpers'
import {
  formatProductSummary,
  getOrderItems,
  sortOrdersNewestFirst,
} from '../utils/orderHelpers'

const STATUS_TABS = [
  { value: 'All', label: 'Все' },
  { value: 'Pending', label: 'Ожидают' },
  { value: 'Completed', label: 'Завершено' },
  { value: 'Cancelled', label: 'Отменено' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(value) {
  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
  }).format(Number(value || 0))
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [pageError, setPageError] = useState('')
  const [pageMessage, setPageMessage] = useState('')
  const [salesModalOpen, setSalesModalOpen] = useState(false)
  const [detailsOrder, setDetailsOrder] = useState(null)

  const loadOrders = useCallback(() => {
    setLoading(true)
    setPageError('')
    getOrders()
      .then((data) => setOrders(sortOrdersNewestFirst(data)))
      .catch((err) => setPageError(err.message || 'Не удалось загрузить заказы'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const enriched = useMemo(
    () =>
      orders.map((order) => {
        const items = getOrderItems(order)
        const hasItems = items.length > 0
        return {
          ...order,
          orderId: `ORD-${String(order.id).padStart(4, '0')}`,
          productName: formatProductSummary(order),
          hasItems,
          itemCount: items.length,
          trend: hasItems ? [3, 5, 4, 6, 7, 5, 8] : [2, 2, 1, 2, 1, 2, 1],
        }
      }),
    [orders]
  )

  const filtered = useMemo(() => {
    let list = enriched
    if (activeTab !== 'All') {
      list = list.filter((o) => o.status === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          o.status.toLowerCase().includes(q) ||
          String(o.id).includes(q)
      )
    }
    return list
  }, [enriched, activeTab, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const openCreate = () => {
    setSalesModalOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      openCreate()
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const openEdit = (order) => {
    setEditOrder(order)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setPageError('')
    try {
      await deleteOrder(deleteTarget.id)
      setDeleteTarget(null)
      setSelected(new Set())
      setPageMessage(`Заказ ${deleteTarget.orderId} удалён.`)
      loadOrders()
    } catch (err) {
      setPageError(err.message || 'Не удалось удалить заказ')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    const count = selected.size
    setDeleting(true)
    setPageError('')
    try {
      await Promise.all([...selected].map((id) => deleteOrder(id)))
      setSelected(new Set())
      setPageMessage(`Удалено ${count} заказов.`)
      loadOrders()
    } catch (err) {
      setPageError(err.message || 'Не удалось удалить выбранные заказы')
    } finally {
      setDeleting(false)
    }
  }

  const handleSaved = () => {
    setPageMessage(editOrder ? 'Заказ успешно обновлён.' : 'Заказ успешно создан.')
    loadOrders()
  }

  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set())
    else setSelected(new Set(paginated.map((o) => o.id)))
  }

  const toggleOne = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  if (loading && orders.length === 0) {
    return <div className="page-loading">Загрузка заказов...</div>
  }

  return (
    <div className="orders-page">
      <PageHeader
        breadcrumb="Панель управления › Заказы"
        title="Заказы"
        subtitle="Управляйте и отслеживайте все заказы клиентов."
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Создать продажу
          </button>
        }
      />

      {pageError && <div className="page-alert error">{pageError}</div>}
      {pageMessage && <div className="page-alert success">{pageMessage}</div>}

      <div className="card page-card">
        <FilterTabs
          tabs={STATUS_TABS}
          active={activeTab}
          onChange={(tab) => { setActiveTab(tab); setPage(1) }}
        />

        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          searchPlaceholder="Поиск заказов..."
        >
          {selected.size > 0 && (
            <button
              type="button"
              className="toolbar-btn danger-text"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              <Trash2 size={15} /> Удалить ({selected.size})
            </button>
          )}
        </TableToolbar>

        <div className="data-table-wrapper">
          <table className="data-table orders-table">
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selected.size === paginated.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Заказ</th>
                <th>Товар</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Тренд</th>
                <th>Сумма</th>
                <th className="col-actions" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">Заказы не найдены</td>
                </tr>
              ) : (
                paginated.map((order) => (
                  <tr key={order.id} className={!order.hasItems ? 'row-warning' : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                      />
                    </td>
                    <td className="order-id">{order.orderId}</td>
                    <td>
                      <span className={!order.hasItems ? 'text-warning' : undefined}>
                        {order.productName}
                      </span>
                      {order.itemCount > 1 && (
                        <span className="item-count-badge">{order.itemCount} товара</span>
                      )}
                    </td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <Sparkline
                        data={order.trend}
                        color={order.hasItems ? '#10b981' : '#f59e0b'}
                      />
                    </td>
                    <td className="amount-cell">{formatCurrency(order.total_amount)}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn-icon-small view"
                          title="Показать детали"
                          onClick={() => setDetailsOrder(order)}
                        >
                          <Eye size={16} />
                        </button>
                        <ActionsMenu
                          onEdit={() => openEdit(order)}
                          onDelete={() => setDeleteTarget(order)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      </div>

      <OrderFormModal
        open={formOpen}
        order={editOrder}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <SalesModal
        open={salesModalOpen}
        onClose={() => setSalesModalOpen(false)}
        onSaved={() => {
          setPageMessage('Продажа успешно создана.')
          setSalesModalOpen(false)
          loadOrders()
        }}
      />

      <OrderDetailsModal
        open={!!detailsOrder}
        order={detailsOrder}
        onClose={() => setDetailsOrder(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить заказ"
        message={`Вы уверены, что хотите удалить заказ ${deleteTarget?.orderId || deleteTarget?.id}? Запасы будут восстановлены для связанных товаров.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <style>{`
        .actions-cell {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-icon-small {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s, color 0.2s;
          color: #666;
        }

        .btn-icon-small:hover {
          background: #f0f0f0;
          color: #1976d2;
        }

        .btn-icon-small.view:hover {
          color: #0d47a1;
        }
      `}</style>
    </div>
  )
}
