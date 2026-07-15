/**
 * Settings Store — Tizim sozlamalari ombori
 */

export interface SystemSettings {
  // Camera
  cameraResolution: '720p' | '1080p' | '4K'
  cameraFps: number
  cameraSource: 'webcam' | 'ipcam'
  ipCameraUrl: string

  // AI Sensitivity
  motionSensitivity: number      // 1 (yuqori) - 10 (past)
  faceConfidence: number          // 50% - 90%
  detectionIntervalMs: number     // Cooldown

  // AI Assistant & API
  geminiModel: 'gemini-1.5-flash' | 'gemini-1.5-pro'
  geminiApiKey: string

  // Sound & Alerts
  soundAlerts: boolean
  motionAlertSound: boolean
  unknownFaceAlertSound: boolean

  // Theme Accent
  themeAccent: 'cyan' | 'emerald' | 'violet' | 'amber'
}

const SETTINGS_STORAGE_KEY = 'camai_system_settings'

const DEFAULT_SETTINGS: SystemSettings = {
  cameraResolution: '720p',
  cameraFps: 30,
  cameraSource: 'webcam',
  ipCameraUrl: '',
  motionSensitivity: 3.5,
  faceConfidence: 75,
  detectionIntervalMs: 8000,
  geminiModel: 'gemini-1.5-flash',
  geminiApiKey: '',
  soundAlerts: true,
  motionAlertSound: false,
  unknownFaceAlertSound: true,
  themeAccent: 'cyan'
}

function loadSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: SystemSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('[SettingsStore] Storage error:', e)
  }
}

type SettingsListener = (settings: SystemSettings) => void
const listeners = new Set<SettingsListener>()

function notify() {
  const current = loadSettings()
  listeners.forEach(l => l(current))
}

export const settingsStore = {
  get(): SystemSettings {
    return loadSettings()
  },

  update(partial: Partial<SystemSettings>): SystemSettings {
    const current = loadSettings()
    const updated = { ...current, ...partial }
    saveSettings(updated)
    notify()
    return updated
  },

  resetDefaults(): SystemSettings {
    saveSettings(DEFAULT_SETTINGS)
    notify()
    return DEFAULT_SETTINGS
  },

  subscribe(listener: SettingsListener): () => void {
    listeners.add(listener)
    listener(loadSettings())
    return () => listeners.delete(listener)
  }
}
