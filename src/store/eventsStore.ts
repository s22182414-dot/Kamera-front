import { apiService } from '../services/api'

export type EventType = 'face_known' | 'face_unknown' | 'motion'

export interface CamEvent {
  id: string
  timestamp: string      // ISO format
  date: string           // YYYY-MM-DD
  time: string           // HH:MM:SS
  type: EventType
  person?: string        // Taniqli bo'lsa ismi
  confidence?: number    // 0-100
  imageData?: string     // base64 thumbnail
}

const STORAGE_KEY = 'camai_events'
const MAX_EVENTS = 500

function loadEvents(): CamEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEvents(events: CamEvent[]) {
  try {
    const trimmed = events.slice(-MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.warn('[EventsStore] Local cache limit reached:', e)
  }
}

type Listener = (events: CamEvent[]) => void
const listeners = new Set<Listener>()

function notify() {
  const events = loadEvents()
  listeners.forEach(l => l(events))
}

export const eventsStore = {
  getAll(): CamEvent[] {
    return loadEvents()
  },

  getToday(): CamEvent[] {
    const today = new Date().toISOString().split('T')[0]
    return loadEvents().filter(e => e.date === today)
  },

  getByDate(date: string): CamEvent[] {
    return loadEvents().filter(e => e.date === date)
  },

  addEvent(params: {
    type: EventType
    person?: string
    confidence?: number
    imageData?: string
  }): CamEvent {
    const now = new Date()
    const event: CamEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: params.type,
      person: params.person,
      confidence: params.confidence,
      imageData: params.imageData,
    }

    const events = loadEvents()
    events.push(event)
    saveEvents(events)
    notify()

    // 🚀 Python Backend Database bilan doimiy sinxronizatsiya
    apiService.saveEvent({
      type: params.type,
      person_name: params.person,
      confidence: params.confidence,
      image_base64: params.imageData
    }).catch(err => console.warn('[Backend DB Sync Error]:', err))

    return event
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEY)
    notify()
  },

  getTodayStats() {
    const today = this.getToday()
    const knownVisitors: Record<string, string[]> = {}
    let unknownCount = 0
    let motionCount = 0

    for (const e of today) {
      if (e.type === 'face_known' && e.person) {
        if (!knownVisitors[e.person]) knownVisitors[e.person] = []
        knownVisitors[e.person].push(e.time)
      } else if (e.type === 'face_unknown') {
        unknownCount++
      } else if (e.type === 'motion') {
        motionCount++
      }
    }

    return {
      total: today.length,
      knownCount: Object.keys(knownVisitors).length,
      unknownCount,
      motionCount,
      knownVisitors,
    }
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    listener(loadEvents())
    return () => listeners.delete(listener)
  },
}
