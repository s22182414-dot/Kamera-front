/**
 * CamAI Backend REST API Service
 * Python FastAPI Backend Server (http://127.0.0.1:8000) bilan aloqa qiladi.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

export interface ApiEvent {
  id: number
  timestamp: string
  date: string
  time: string
  type: 'motion' | 'face_known' | 'face_unknown'
  person_name?: string
  confidence?: number
  image?: string
}

export interface ApiPerson {
  id: number
  name: string
  role?: string
  photo?: string
  added_at: string
}

export const apiService = {
  /** Server ish holatini tekshirish */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('http://127.0.0.1:8000/')
      return res.ok
    } catch {
      return false
    }
  },

  /** Barcha voqealarni bazadan olish */
  async getEvents(date?: string): Promise<ApiEvent[]> {
    try {
      const url = date ? `${API_BASE_URL}/events?date=${date}` : `${API_BASE_URL}/events`
      const res = await fetch(url)
      if (!res.ok) return []
      const data = await res.json()
      return data.events || []
    } catch (e) {
      console.warn('[API] Server un-reachable, using local cache:', e)
      return []
    }
  },

  /** Yangi voqeani ma'lumotlar bazasiga saqlash */
  async saveEvent(event: {
    type: string
    person_name?: string
    confidence?: number
    image_base64?: string
  }): Promise<ApiEvent | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.event
    } catch (e) {
      console.error('[API] Event save error:', e)
      return null
    }
  },

  /** Taniqli shaxslarni bazadan olish */
  async getPersons(): Promise<ApiPerson[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/persons`)
      if (!res.ok) return []
      const data = await res.json()
      return data.persons || []
    } catch (e) {
      console.warn('[API] Persons fetch error:', e)
      return []
    }
  },

  /** Yangi shaxsni bazaga saqlash */
  async savePerson(person: { name: string; role: string; photo_base64: string }): Promise<ApiPerson | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person)
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.person
    } catch (e) {
      console.error('[API] Person save error:', e)
      return null
    }
  },

  /** Shaxsni o'chirish */
  async deletePerson(id: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/persons/${id}`, { method: 'DELETE' })
      return res.ok
    } catch {
      return false
    }
  },

  /** AI Chat - Gemini va SQLite bazasidan javob olish */
  async queryAiChat(message: string, date?: string): Promise<string> {
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, date })
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      return data.reply
    } catch (e) {
      console.warn('[API] Chat request fallback:', e)
      return ''
    }
  }
}
