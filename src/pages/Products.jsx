import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { getProducts, deleteProduct } from '../api'
import StatusBadge from '../components/ui/StatusBadge'
import ActionsMenu, { ConfirmDialog } from '../components/ui/ActionsMenu'
import ProductFormModal from '../components/products/ProductFormModal'
import Pagination, {
  PageHeader,
  FilterTabs,
  TableToolbar,
  ToolbarButton,
} from '../components/ui/TableHelpers'

const STATUS_TABS = [
  { value: 'All', label: 'Все' },
  { value: 'Active', label: 'Активные' },
  { value: 'Draft', label: 'Черновики' },
  { value: 'Archived', label: 'Архив' },
]

function getProductStatus(product) {
  if (product.stock_quantity <= 0) return 'Draft'
  if (product.stock_quantity <= product.minimum_stock) return 'Draft'
  return 'Active'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
  }).format(Number(value || 0))
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadProducts = useCallback(() => {
    setLoading(true)
    getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const categories = useMemo(() => {
    const names = new Set(products.map((p) => p.category?.name).filter(Boolean))
    return ['All', ...names]
  }, [products])

  const enriched = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        status: getProductStatus(product),
        categoryName: product.category?.name || 'Без категории',
      })),
    [products]
  )

  const filtered = useMemo(() => {
    let list = enriched
    if (activeTab !== 'All') {
      list = list.filter((p) => p.status === activeTab)
    }
    if (categoryFilter !== 'All') {
      list = list.filter((p) => p.categoryName === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      )
    }
    return list
  }, [enriched, activeTab, categoryFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const openCreate = () => {
    setEditProduct(null)
    setFormOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      openCreate()
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const openEdit = (product) => {
    setEditProduct(product)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProduct(deleteTarget.id)
      setDeleteTarget(null)
      setSelected(new Set())
      loadProducts()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map((id) => deleteProduct(id)))
      setSelected(new Set())
      loadProducts()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set())
    else setSelected(new Set(paginated.map((p) => p.id)))
  }

  const toggleOne = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  if (loading && products.length === 0) {
    return <div className="page-loading">Загрузка товаров...</div>
  }

  return (
    <div className="products-page">
      <PageHeader
        breadcrumb="Панель управления › Товары"
        title="Товары"
        subtitle="Просматривайте и управляйте каталогом товаров."
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Добавить товар
          </button>
        }
      />

      <div className="card page-card">
        <FilterTabs tabs={STATUS_TABS} active={activeTab} onChange={(tab) => { setActiveTab(tab); setPage(1) }} />

        <TableToolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1) }} searchPlaceholder="Поиск товаров...">
          {selected.size > 0 && (
            <button type="button" className="toolbar-btn danger-text" onClick={handleBulkDelete} disabled={deleting}>
              <Trash2 size={15} /> Удалить ({selected.size})
            </button>
          )}
          <select
            className="category-select"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'All' ? 'Все категории' : cat}</option>
            ))}
          </select>
        </TableToolbar>

        <div className="data-table-wrapper">
          <table className="data-table products-table">
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selected.size === paginated.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Товар</th>
                <th>Категория</th>
                <th>Статус</th>
                <th>Остаток</th>
                <th>Цена</th>
                <th className="col-actions" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">Товары не найдены</td>
                </tr>
              ) : (
                paginated.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleOne(product.id)}
                      />
                    </td>
                    <td>
                      <div className="product-row-cell">
                        <div>
                          <strong>{product.name}</strong>
                          <span>{product.description || 'Нет описания'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{product.categoryName}</td>
                    <td><StatusBadge status={product.status} /></td>
                    <td>{product.stock_quantity}</td>
                    <td className="amount-cell">{formatCurrency(product.price)}</td>
                    <td>
                      <ActionsMenu
                        onEdit={() => openEdit(product)}
                        onDelete={() => setDeleteTarget(product)}
                      />
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

      <ProductFormModal
        open={formOpen}
        product={editProduct}
        onClose={() => setFormOpen(false)}
        onSaved={loadProducts}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить товар"
        message={`Вы уверены, что хотите удалить "${deleteTarget?.name}"? Действие нельзя будет отменить.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
