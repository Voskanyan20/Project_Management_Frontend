import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { getCategories, deleteCategory } from '../api'
import CategoryFormModal from '../components/categories/CategoryFormModal'
import Pagination, {
  PageHeader,
  TableToolbar,
} from '../components/ui/TableHelpers'
import ActionsMenu, { ConfirmDialog } from '../components/ui/ActionsMenu'
import { formatCategoryOptionsSummary, formatCategoryName, getCategoryParentId } from '../utils/productHelpers'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formOpen, setFormOpen] = useState(false)
  const [editCategory, setEditCategory] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [pageError, setPageError] = useState('')
  const [pageMessage, setPageMessage] = useState('')

  const loadCategories = useCallback(() => {
    setLoading(true)
    setPageError('')
    getCategories()
      .then(setCategories)
      .catch((err) => setPageError(err.message || 'Не удалось загрузить категории'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((cat) => {
      const parentName = cat.parent?.name || ''
      return (
        cat.name?.toLowerCase().includes(q) ||
        parentName.toLowerCase().includes(q) ||
        formatCategoryName(cat).toLowerCase().includes(q)
      )
    })
  }, [categories, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const openCreate = () => {
    setEditCategory(null)
    setFormOpen(true)
  }

  const openEdit = (category) => {
    setEditCategory(category)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setPageError('')
    try {
      await deleteCategory(deleteTarget.id)
      setPageMessage(`Категория "${deleteTarget.name}" удалена.`)
      setDeleteTarget(null)
      loadCategories()
    } catch (err) {
      setPageError(err.message || 'Не удалось удалить категорию')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && categories.length === 0) {
    return <div className="page-loading">Загрузка категорий...</div>
  }

  return (
    <div className="categories-page">
      <PageHeader
        breadcrumb="Панель управления › Категории"
        title="Категории"
        subtitle="Создавайте, редактируйте и удаляйте категории товаров."
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Добавить категорию
          </button>
        }
      />

      {pageError && <div className="page-alert error">{pageError}</div>}
      {pageMessage && <div className="page-alert success">{pageMessage}</div>}

      <div className="card page-card">
        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          searchPlaceholder="Поиск категорий..."
        />

        <div className="data-table-wrapper">
          <table className="data-table categories-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Название</th>
                <th>Тип</th>
                <th>Родитель</th>
                <th>Опции</th>
                <th>Дата создания</th>
                <th className="col-actions" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">Категории не найдены</td>
                </tr>
              ) : (
                paginated.map((category, index) => (
                  <tr key={category.id}>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td>{category.name}</td>
                    <td>{getCategoryParentId(category) ? 'Подкategория' : 'Категория'}</td>
                    <td>{category.parent?.name || '—'}</td>
                    <td className="options-cell">{formatCategoryOptionsSummary(category)}</td>
                    <td>{new Date(category.createdAt || category.created_at || Date.now()).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <ActionsMenu
                        onEdit={() => openEdit(category)}
                        onDelete={() => setDeleteTarget(category)}
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

      <CategoryFormModal
        open={formOpen}
        category={editCategory}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          loadCategories()
          setPageMessage(editCategory ? 'Категория обновлена.' : 'Категория добавлена.')
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить категорию"
        message={`Вы уверены, что хотите удалить категорию "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
