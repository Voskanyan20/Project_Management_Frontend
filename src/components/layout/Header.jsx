import { Search, Moon, Bell, Plus } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth, getInitials } from '../../context/AuthContext'

const pageActions = {
  '/': { label: 'Новый заказ', to: '/orders?action=create' },
  '/orders': { label: 'Новый заказ', to: '/orders?action=create' },
  '/products': { label: 'Добавить товар', to: '/products?action=create' },
  '/calendar': { label: 'Добавить событие', to: '/calendar?action=create' },
}

export default function Header() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const action = pageActions[pathname] || pageActions['/']

  return (
    <header className="top-header">
      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input type="text" placeholder="Поиск..." />
        <kbd>⌘K</kbd>
      </div>

      <div className="header-actions">
        <Link to={action.to} className="btn btn-primary btn-sm">
          <Plus size={16} />
          {action.label}
        </Link>
        <button type="button" className="icon-btn" aria-label="Переключить тему">
          <Moon size={18} />
        </button>
        <button type="button" className="icon-btn notification-btn" aria-label="Уведомления">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <div className="header-avatar">{getInitials(user?.name)}</div>
      </div>
    </header>
  )
}
