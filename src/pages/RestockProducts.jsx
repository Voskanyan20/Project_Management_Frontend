import { useCallback, useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { getRestockProducts, updateProduct } from '../api'
import ProductTypeBadge from '../components/ui/ProductTypeBadge'
import Pagination, {
  PageHeader,
  TableToolbar,
} from '../components/ui/TableHelpers'
import { getProductTypeLabel } from '../utils/productType'
import { formatProductDisplayName, formatProductOptionValueLabels } from '../utils/productHelpers'

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

function getNeededQuantity(product) {
  return Number(product.minimum_stock) || 0
}

export default function RestockProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [updating, setUpdating] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)

  const loadProducts = useCallback(() => {
    setLoading(true)
    getRestockProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const filtered = products.filter((product) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      product.name?.toLowerCase().includes(q) ||
      product.description?.toLowerCase().includes(q) ||
      product.category?.name?.toLowerCase().includes(q) ||
      formatProductOptionValueLabels(product).toLowerCase().includes(q) ||
      getProductTypeLabel(product.product_type).toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleEdit = (product) => {
    setEditingProduct(product.id)
    setEditQuantity(product.stock_quantity.toString())
  }

  const handleCancel = () => {
    setEditingProduct(null)
    setEditQuantity('')
  }

  const handleSave = async (productId) => {
    try {
      setUpdating(true)
      const product = products.find(p => p.id === productId)
      await updateProduct(productId, {
        name: product.name,
        description: product.description,
        cost_price: product.cost_price,
        price: product.price,
        stock_quantity: parseInt(editQuantity),
        minimum_stock: product.minimum_stock,
        category_id: product.category_id,
        product_type: product.product_type,
        option_values: product.option_values,
      })
      await loadProducts()
      setEditingProduct(null)
      setEditQuantity('')
    } catch (error) {
      console.error('Failed to update product:', error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading && products.length === 0) {
    return <div className="page-loading">Загрузка товаров для пополнения...</div>
  }

  return (
    <div className="products-page">
      <PageHeader
        breadcrumb="Панель управления › Пополнение товаров"
        title="Пополнение товаров"
        subtitle="Товары, требующие пополнения запасов."
        action={
          <button type="button" className="btn btn-primary" onClick={() => setShowPrintView(true)}>
            <Printer size={16} />
            Печать
          </button>
        }
      />

      <div className="card page-card">
        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          searchPlaceholder="Поиск товаров..."
        />

        <div className="data-table-wrapper">
          <table className="data-table products-table">
            <thead>
              <tr>
                <th>Товар</th>
                <th>Категория</th>
                <th>Тип закупки</th>
                <th>Текущий остаток</th>
                <th>Мин. запас</th>
                <th>Необходимо</th>
                <th>Цена</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-cell">
                    {loading ? 'Загрузка...' : 'Товары для пополнения не найдены'}
                  </td>
                </tr>
              ) : (
                paginated.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-row-cell">
                        <div>
                          <strong>{formatProductDisplayName(product)}</strong>
                          <span>{product.description || 'Нет описания'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{product.category?.name || 'Без категории'}</td>
                    <td><ProductTypeBadge type={product.product_type} /></td>
                    <td className={product.stock_quantity <= product.minimum_stock ? 'danger-text' : ''}>
                      {editingProduct === product.id ? (
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="input-field"
                          style={{ width: '80px' }}
                          min="0"
                        />
                      ) : (
                        product.stock_quantity
                      )}
                    </td>
                    <td>{product.minimum_stock}</td>
                    <td className="danger-text">{getNeededQuantity(product)}</td>
                    <td className="amount-cell">{formatCurrency(product.price)}</td>
                    <td>{formatDate(product.createdAt)}</td>
                    <td>
                      {editingProduct === product.id ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleSave(product.id)}
                            disabled={updating}
                          >
                            {updating ? 'Сохранение...' : 'Сохранить'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={handleCancel}
                            disabled={updating}
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(product)}
                        >
                          Изменить
                        </button>
                      )}
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

      {showPrintView && (
        <div className="modal-overlay" onClick={() => setShowPrintView(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <style>{`
              .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
              }
              .modal-header {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                padding: 20px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .modal-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
              }
              .modal-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 28px;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
              }
              .modal-close:hover {
                background: rgba(255, 255, 255, 0.3);
              }
              .modal-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
              }
              .modal-footer {
                padding: 20px 24px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
              }
              .print-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              .print-table th {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                font-weight: 600;
                padding: 14px 16px;
                text-align: left;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .print-table th:first-child {
                border-top-left-radius: 8px;
              }
              .print-table th:last-child {
                border-top-right-radius: 8px;
              }
              .print-table td {
                border-bottom: 1px solid #e5e7eb;
                padding: 14px 16px;
                color: #374151;
                font-size: 14px;
              }
              .print-table tr:last-child td {
                border-bottom: none;
              }
              .print-table tr:nth-child(even) {
                background-color: #f9fafb;
              }
              .print-table tr:hover {
                background-color: #f3f4f6;
              }
              .text-center {
                text-align: center;
              }
              .text-sm {
                font-size: 12px;
                color: #6b7280;
                margin-top: 4px;
              }
              .text-gray-600 {
                color: #6b7280;
              }
              .font-bold {
                font-weight: 700;
                color: #1f2937;
                font-size: 16px;
              }
            `}</style>
            <div className="modal-header">
              <h2>Список товаров для пополнения</h2>
              <button className="modal-close" onClick={() => setShowPrintView(false)}>×</button>
            </div>
            <div className="modal-body">
              <div id="printable-restock-list">
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Товар</th>
                      <th>Категория</th>
                      <th>Тип закупки</th>
                      <th>Необходимо</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center">Товары для пополнения не найдены</td>
                      </tr>
                    ) : (
                      filtered.map((product, index) => (
                        <tr key={product.id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{formatProductDisplayName(product)}</strong>
                            {product.description && <div className="text-sm text-gray-600">{product.description}</div>}
                          </td>
                          <td>{product.category?.name || 'Без категории'}</td>
                          <td>{getProductTypeLabel(product.product_type)}</td>
                          <td className="text-center font-bold">
                            {getNeededQuantity(product)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPrintView(false)}>
                Закрыть
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const printContent = document.getElementById('printable-restock-list').innerHTML
                  const printWindow = window.open('', '', 'height=600,width=800')
                  printWindow.document.write('<html><head><title>Список товаров для пополнения</title>')
                  printWindow.document.write('<style>')
                  printWindow.document.write('body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background: #f9fafb; }')
                  printWindow.document.write('h1 { color: #1f2937; font-size: 28px; margin-bottom: 10px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }')
                  printWindow.document.write('p { color: #6b7280; font-size: 14px; margin-bottom: 20px; }')
                  printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }')
                  printWindow.document.write('th { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; font-weight: 600; padding: 14px 16px; text-align: left; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }')
                  printWindow.document.write('th:first-child { border-top-left-radius: 8px; }')
                  printWindow.document.write('th:last-child { border-top-right-radius: 8px; }')
                  printWindow.document.write('td { border-bottom: 1px solid #e5e7eb; padding: 14px 16px; color: #374151; font-size: 14px; }')
                  printWindow.document.write('tr:last-child td { border-bottom: none; }')
                  printWindow.document.write('tr:nth-child(even) { background-color: #f9fafb; }')
                  printWindow.document.write('tr:hover { background-color: #f3f4f6; }')
                  printWindow.document.write('.text-center { text-align: center; }')
                  printWindow.document.write('.text-sm { font-size: 12px; color: #6b7280; margin-top: 4px; }')
                  printWindow.document.write('.text-gray-600 { color: #6b7280; }')
                  printWindow.document.write('.font-bold { font-weight: 700; color: #1f2937; font-size: 16px; }')
                  printWindow.document.write('@media print { body { background: white; } table { box-shadow: none; } }')
                  printWindow.document.write('</style>')
                  printWindow.document.write('</head><body>')
                  printWindow.document.write('<h1>Список товаров для пополнения</h1>')
                  printWindow.document.write('<p>Дата: ' + new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) + '</p>')
                  printWindow.document.write(printContent)
                  printWindow.document.write('</body></html>')
                  printWindow.document.close()
                  printWindow.print()
                }}
              >
                <Printer size={16} />
                Печать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
