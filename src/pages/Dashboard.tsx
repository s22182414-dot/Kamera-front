import './Dashboard.css'
import { useState, useEffect } from 'react'
import { Sidebar, CameraPanel, ChatPanel, EventsPanel, StatsBar, PersonsView } from '../components'
import type { ActiveView } from '../types'

interface DashboardProps {
  onLogout: () => void
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const saved = localStorage.getItem('camai_active_view')
    if (saved === 'settings') return 'dashboard'
    return (saved as ActiveView) || 'dashboard'
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('camai_sidebar_collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('camai_active_view', activeView)
  }, [activeView])

  useEffect(() => {
    localStorage.setItem('camai_sidebar_collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="dashboard-main">
        <StatsBar />
        <div className="dashboard-content">
          {activeView === 'dashboard' && (
            <div className="main-grid animate-fade-in">
              <div className="camera-col"><CameraPanel /></div>
              <div className="chat-col"><ChatPanel /></div>
            </div>
          )}
          {activeView === 'events' && (
            <div className="animate-fade-in full-panel"><EventsPanel /></div>
          )}
          {activeView === 'persons' && (
            <div className="animate-fade-in full-panel"><PersonsView /></div>
          )}
        </div>
      </div>
    </div>
  )
}




