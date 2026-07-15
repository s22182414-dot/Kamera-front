import { useState, useEffect } from 'react'
import { eventsStore, type CamEvent } from '../store/eventsStore'

/** Barcha voqealar uchun real-time hook */
export function useEvents() {
  const [events, setEvents] = useState<CamEvent[]>([])

  useEffect(() => {
    const unsub = eventsStore.subscribe(setEvents)
    return unsub
  }, [])

  return events
}

/** Bugungi voqealar uchun hook */
export function useTodayEvents() {
  const [events, setEvents] = useState<CamEvent[]>([])

  useEffect(() => {
    const unsub = eventsStore.subscribe(() => {
      setEvents(eventsStore.getToday())
    })
    return unsub
  }, [])

  return events
}

/** Bugungi statistika uchun hook */
export function useTodayStats() {
  const [stats, setStats] = useState(eventsStore.getTodayStats())

  useEffect(() => {
    const unsub = eventsStore.subscribe(() => {
      setStats(eventsStore.getTodayStats())
    })
    return unsub
  }, [])

  return stats
}
