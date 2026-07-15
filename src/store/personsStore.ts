import { apiService } from '../services/api'

export interface KnownPerson {
  id: string
  name: string
  role: 'employee' | 'family' | 'guest' | 'vip' | 'captured'
  photo: string            // Base64 image
  addedAt: string          // ISO date
  isAutoCaptured?: boolean // Kameradan avto tushgan yuz
}

const PERSONS_STORAGE_KEY = 'camai_known_persons'

// Demoga tegishli soxta ismlar olib tashlandi, boshlang'ich ro'yxat toza BO'SH
const INITIAL_PERSONS: KnownPerson[] = []

function loadPersons(): KnownPerson[] {
  try {
    const raw = localStorage.getItem(PERSONS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : INITIAL_PERSONS
  } catch {
    return INITIAL_PERSONS
  }
}

function savePersons(persons: KnownPerson[]) {
  try {
    localStorage.setItem(PERSONS_STORAGE_KEY, JSON.stringify(persons))
  } catch (e) {
    console.warn('[PersonsStore] Cache error:', e)
  }
}

type PersonsListener = (persons: KnownPerson[]) => void
const listeners = new Set<PersonsListener>()

function notify() {
  const persons = loadPersons()
  listeners.forEach(l => l(persons))
}

export const personsStore = {
  getAll(): KnownPerson[] {
    return loadPersons()
  },

  addPerson(params: { name: string; role: KnownPerson['role']; photo: string }): KnownPerson {
    const newPerson: KnownPerson = {
      id: `p-${Date.now()}`,
      name: params.name.trim(),
      role: params.role,
      photo: params.photo,
      addedAt: new Date().toISOString()
    }

    const list = loadPersons()
    list.unshift(newPerson)
    savePersons(list)
    notify()

    apiService.savePerson({
      name: params.name,
      role: params.role,
      photo_base64: params.photo
    }).catch(err => console.warn('[Backend DB Sync Error]:', err))

    return newPerson
  },

  /** Kamera tomonidan avtomatik tutilgan yuz snapshotini saqlash */
  addAutoCapturedFace(photoBase64: string, nameProposal?: string): KnownPerson {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    const personName = nameProposal || `Noma'lum Shaxs (${timeStr})`

    const newPerson: KnownPerson = {
      id: `cap-${Date.now()}`,
      name: personName,
      role: 'captured',
      photo: photoBase64,
      addedAt: now.toISOString(),
      isAutoCaptured: true
    }

    const list = loadPersons()
    list.unshift(newPerson)
    savePersons(list)
    notify()

    apiService.savePerson({
      name: personName,
      role: 'captured',
      photo_base64: photoBase64
    }).catch(err => console.warn('[Backend DB Sync Error]:', err))

    return newPerson
  },

  updatePerson(id: string, params: { name: string; role: KnownPerson['role'] }) {
    const list = loadPersons().map(p => {
      if (p.id === id) {
        return {
          ...p,
          name: params.name,
          role: params.role,
          isAutoCaptured: false
        }
      }
      return p
    })
    savePersons(list)
    notify()
  },

  deletePerson(id: string) {
    const list = loadPersons().filter(p => p.id !== id)
    savePersons(list)
    notify()
  },

  clearAll() {
    savePersons([])
    notify()
  },

  subscribe(listener: PersonsListener): () => void {
    listeners.add(listener)
    listener(loadPersons())
    return () => listeners.delete(listener)
  }
}
