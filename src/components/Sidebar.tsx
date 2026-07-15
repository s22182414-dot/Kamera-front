import './Sidebar.css'
import { Camera, LayoutDashboard, Users, LogOut, Shield, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { ActiveView } from '../types'

interface SidebarProps {
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  onLogout: () => void
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'events' as ActiveView, label: 'Voqealar', icon: Camera },
  { id: 'persons' as ActiveView, label: 'Shaxslar', icon: Users },
]

export default function Sidebar({ activeView, onViewChange, onLogout, collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo Header */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-brand" onClick={collapsed ? onToggle : undefined} style={{ cursor: collapsed ? 'pointer' : 'default' }}>
          <div className="sidebar-logo-icon" title={collapsed ? 'Kengaytirish' : undefined}>
            <Shield size={18} />
          </div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-brand">CamAI</span>
              <span className="sidebar-version">v1.0</span>
            </div>
          )}
        </div>

        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          title={collapsed ? 'Kengaytirish' : 'Yig\'ish'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <div className="sidebar-divider" />

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-item-icon">
                <Icon size={18} />
              </span>
              {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
              {isActive && <span className="sidebar-active-indicator" />}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <div className="sidebar-user" title={collapsed ? 'Admin (Online)' : undefined}>
          <div className="sidebar-avatar">A</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-username">Admin</span>
              <span className="sidebar-status">
                <span className="status-dot" />
                Online
              </span>
            </div>
          )}
        </div>
        <button
          className="sidebar-item sidebar-logout"
          onClick={onLogout}
          title={collapsed ? 'Chiqish' : undefined}
        >
          <span className="sidebar-item-icon">
            <LogOut size={18} />
          </span>
          {!collapsed && <span className="sidebar-item-label">Chiqish</span>}
        </button>
      </div>
    </aside>
  )
}
