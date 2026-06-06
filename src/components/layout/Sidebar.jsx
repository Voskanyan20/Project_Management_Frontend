import { NavLink, useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  Package,
  CalendarDays,
  LayoutDashboard,
  BookOpen,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import { useAuth, getInitials } from '../../context/AuthContext'

const navSections = [
  {
    label: 'Обзор',
    items: [
      { to: '/', label: 'Дашборд', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Торговля',
    items: [
      { to: '/orders', label: 'Заказы', icon: ShoppingBag },
      { to: '/products', label: 'Товары', icon: Package },
      { to: '/restock', label: 'Пополнение', icon: RefreshCw },
      { to: '/categories', label: 'Категории', icon: BookOpen },
    ],
  },
  {
    label: 'Приложения',
    items: [
      { to: '/calendar', label: 'Календарь', icon: CalendarDays },
    ],
  },
]

export default function Sidebar({ onNavigate }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/signin')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">P</div>
        <div className="logo-text">
          <span className="logo-name">Product</span>
          <span className="logo-sub">Management</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label} className="nav-section">
            <span className="nav-section-label">{section.label}</span>
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `nav-item${isActive ? ' active' : ''}`
                }
                onClick={() => onNavigate?.()}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar-sm">{getInitials(user?.name)}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Пользователь'}</span>
            <span className="user-role">{user?.Role || 'Участник'}</span>
          </div>
          <button type="button" className="logout-btn" aria-label="Выйти" onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
