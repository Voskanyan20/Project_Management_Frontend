import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="pagination">
      <span className="pagination-info">
        Показано {start}-{end} из {totalItems}
      </span>
      <div className="pagination-controls">
        <label className="rows-select">
          Строк
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
        <button
          type="button"
          className="page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Назад
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className={`page-btn page-num${p === page ? ' active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Вперёд
        </button>
      </div>
    </div>
  )
}

export function PageHeader({ breadcrumb, title, subtitle, action }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        {breadcrumb && <p className="breadcrumb">{breadcrumb}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  )
}

export function FilterTabs({ tabs, active, onChange }) {
  return (
    <div className="filter-tabs">
      {tabs.map((tab) => {
        const value = typeof tab === 'string' ? tab : tab.value
        const label = typeof tab === 'string' ? tab : tab.label
        return (
          <button
            key={value}
            type="button"
            className={`filter-tab${active === value ? ' active' : ''}`}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function TableToolbar({ search, onSearchChange, searchPlaceholder, children }) {
  return (
    <div className="table-toolbar">
      <div className="table-search">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="table-toolbar-actions">{children}</div>
    </div>
  )
}

export function ToolbarButton({ children, onClick }) {
  return (
    <button type="button" className="toolbar-btn" onClick={onClick}>
      {children}
    </button>
  )
}
