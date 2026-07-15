import './StatsBar.css'
import { Activity, Eye, Users, AlertTriangle, Clock } from 'lucide-react'
import { useTodayStats } from '../hooks/useEvents'
import { useState, useEffect } from 'react'

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
]

const WEEKDAYS_UZ = [
  'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'
]

export default function StatsBar() {
  const stats = useTodayStats()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = time.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const dayNum = time.getDate()
  const monthName = MONTHS_UZ[time.getMonth()]
  const dayName = WEEKDAYS_UZ[time.getDay()]
  const dateStr = `${dayNum}-${monthName}, ${dayName}`

  const statItems = [
    { icon: Eye,          label: 'Jami',     value: String(stats.total),       color: 'accent'  },
    { icon: Users,        label: 'Taniqli',  value: String(stats.knownCount),  color: 'success' },
    { icon: AlertTriangle,label: "Noma'lum", value: String(stats.unknownCount),color: 'warning' },
    { icon: Activity,     label: 'Harakat',  value: String(stats.motionCount), color: 'neon'    },
  ]

  return (
    <div className="stats-bar">
      {/* Left: date/time */}
      <div className="stats-datetime">
        <div className="stats-time">
          <Clock size={14} />
          <span className="stats-time-value">{timeStr}</span>
        </div>
        <span className="stats-date">{dateStr}</span>
      </div>

      {/* Center: stats */}
      <div className="stats-items">
        {statItems.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`stat-item stat-${stat.color}`}>
              <div className="stat-icon"><Icon size={14} /></div>
              <div className="stat-content">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Right: camera status */}
      <div className="stats-right">
        <div className="camera-status">
          <div className="live-dot" />
          <span className="camera-status-text">LIVE</span>
        </div>
        <div className="system-status">
          <span className="system-ok">●</span>
          <span>Tizim ishlayapti</span>
        </div>
      </div>
    </div>
  )
}
