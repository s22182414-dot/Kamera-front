import './EventsPanel.css'
import { useState, useRef, useEffect } from 'react'
import { Camera, User, AlertTriangle, Activity,Calendar, ChevronLeft, ChevronRight as ChevronNext, X, RefreshCw } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { eventsStore, type CamEvent, type EventType } from '../store/eventsStore'

const TYPE_CONFIG: Record<EventType, { icon: typeof User; color: string; label: string }> = {
  face_known:   { icon: User,          color: 'success', label: 'Taniqli' },
  face_unknown: { icon: AlertTriangle, color: 'warning', label: "Noma'lum" },
  motion:       { icon: Activity,      color: 'accent',  label: 'Harakat' },
}

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
]

const WEEKDAYS = ['Dsh', 'Ssh', 'Chr', 'Psh', 'Jum', 'Shn', 'Yak']

interface EventsPanelProps {
  compact?: boolean
}

export default function EventsPanel({ compact = false }: EventsPanelProps) {
  const allEvents = useEvents()
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currDate, setCurrDate] = useState(new Date())

  const popoverRef = useRef<HTMLDivElement>(null)
  const calBtnRef = useRef<HTMLButtonElement>(null)

  // Build set of unique dates that have camera recordings
  const recordedDates = new Set(allEvents.map(e => e.date))

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        calBtnRef.current &&
        !calBtnRef.current.contains(target)
      ) {
        setShowCalendar(false)
      }
    }
    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCalendar])

  // Filter events based on selected date or today
  const targetEvents = selectedDate
    ? eventsStore.getByDate(selectedDate)
    : eventsStore.getToday()

  const sorted = [...targetEvents].reverse()
  const events: CamEvent[] = compact ? sorted.slice(0, 4) : sorted

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr)
    setShowCalendar(false)
  }

  // Calendar days grid generation
  const year = currDate.getFullYear()
  const month = currDate.getMonth()
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = new Date().toISOString().split('T')[0]

  const calendarDays = []
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const monthFormatted = String(month + 1).padStart(2, '0')
    const dayFormatted = String(d).padStart(2, '0')
    const dateStr = `${year}-${monthFormatted}-${dayFormatted}`
    const eventCount = allEvents.filter(e => e.date === dateStr).length

    calendarDays.push({
      day: d,
      dateStr,
      eventCount
    })
  }

  return (
    <div className={`events-panel glass-card ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="events-header">
        <div className="events-header-left">
          <div className="events-icon-wrap">
            <Camera size={15} />
          </div>
          <div>
            <h2 className="events-title">Voqealar Tarixi</h2>
            {!compact && (
              <p className="events-sub">
                {selectedDate ? `📅 ${selectedDate} sanasi yozuvlari` : 'Bugungi qayd etilgan voqealar'}
              </p>
            )}
          </div>
        </div>
        <div className="events-header-right">
          <span className="events-count">{targetEvents.length} ta voqea</span>
          {!compact && (
            <>
              {selectedDate && (
                <button
                  className="btn-ghost text-accent"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  onClick={() => setSelectedDate(null)}
                  title="Barcha/Bugungi voqealarga qaytish"
                >
                  <RefreshCw size={12} /> Barchasi
                </button>
              )}

              <button
                ref={calBtnRef}
                className={`cam-btn ${showCalendar || selectedDate ? 'active-btn' : ''}`}
                onClick={() => setShowCalendar(prev => !prev)}
                title="Sana bo'yicha saralash kalendari"
              >
                <Calendar size={15} />
                {recordedDates.size > 0 && <span className="cal-dot-badge" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Futuristic Calendar Popover */}
      {showCalendar && (
        <div className="calendar-popover events-cal-popover animate-fade-in" ref={popoverRef}>
          <div className="calendar-popover-header">
            <div className="calendar-month-title">
              <Calendar size={14} className="calendar-icon-accent" />
              <span>{MONTH_NAMES[month]} {year}</span>
            </div>
            <div className="calendar-nav">
              <button
                className="cal-nav-btn"
                onClick={() => setCurrDate(new Date(year, month - 1, 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="cal-nav-btn"
                onClick={() => setCurrDate(new Date(year, month + 1, 1))}
              >
                <ChevronNext size={14} />
              </button>
              <button className="cal-nav-btn close-btn" onClick={() => setShowCalendar(false)}>
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="calendar-legend">
            <span className="legend-item">
              <span className="legend-dot active" /> Yozuvli kunlar
            </span>
            <span className="legend-item">
              <span className="legend-dot disabled" /> Yozuvsiz
            </span>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map(w => (
              <span key={w} className="weekday-label">{w}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((item, idx) => {
              if (!item) return <div key={`empty-${idx}`} className="cal-day empty" />
              const isToday = item.dateStr === todayStr
              const isSelected = item.dateStr === selectedDate
              const hasEvents = item.eventCount > 0 || isToday

              return (
                <button
                  key={item.dateStr}
                  className={`cal-day ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${hasEvents ? 'has-events' : 'is-disabled'}`}
                  disabled={!hasEvents}
                  onClick={() => hasEvents && handleSelectDate(item.dateStr)}
                  title={hasEvents ? `${item.dateStr}: ${item.eventCount} ta yozuv` : `${item.dateStr}: Yozuvlar yo'q`}
                >
                  <span>{item.day}</span>
                  {hasEvents && <span className="day-record-dot" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="events-list">
        {events.length === 0 ? (
          <div className="events-empty-container">
            <div className="view-icon-ring">
              <Camera size={32} strokeWidth={1.5} />
            </div>
            <h3 className="events-empty-title">
              {selectedDate ? `${selectedDate} Sanasida Voqealar Yo'q` : 'Hozircha Voqealar Qayd Etilmadi'}
            </h3>
            <p className="events-empty-desc">
              {selectedDate
                ? "Ushbu tanlangan kunda kamera tomonidan hech qanday harakat yoki yozuv olingan emas."
                : "Kamerani yoqsangiz — harakatlar va tanilgan yuzlar avtomatik ushbu ro'yxatda jonli qayd etiladi"}
            </p>
          </div>
        ) : (
          events.map((event, i) => {
            const config = TYPE_CONFIG[event.type]
            const Icon = config.icon
            return (
              <div
                key={event.id}
                className="event-item animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
              >
                {/* Timeline dot */}
                <div className="event-timeline">
                  <div className={`event-dot event-dot-${config.color}`} />
                  {i < events.length - 1 && <div className="event-line" />}
                </div>

                {/* Content */}
                <div className="event-content">
                  <div className="event-main">
                    <div className={`event-type-icon icon-${config.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="event-info">
                      <span className="event-desc">
                        {event.type === 'face_known'
                          ? 'Taniqli shaxs kirdi'
                          : event.type === 'face_unknown'
                          ? "Noma'lum shaxs aniqlandi"
                          : 'Harakat aniqlandi'}
                      </span>
                      {event.person && (
                        <span className="event-person">{event.person}</span>
                      )}
                    </div>
                    <div className="event-meta">
                      {event.confidence !== undefined && (
                        <span className={`event-confidence conf-${config.color}`}>
                          {event.confidence}%
                        </span>
                      )}
                      <span className="event-time">{event.time}</span>
                      <button className="event-btn">
                        <ChevronNext size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
