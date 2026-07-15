import './SettingsView.css'
import { useState, useEffect } from 'react'
import { Settings, Camera, Cpu, Sliders, Check, RefreshCw } from 'lucide-react'
import { settingsStore, type SystemSettings } from '../store/settingsStore'

export default function SettingsView() {
  const [settings, setSettings] = useState<SystemSettings>(() => settingsStore.get())
  const [savedToast, setSavedToast] = useState(false)

  useEffect(() => {
    const unsub = settingsStore.subscribe(setSettings)
    return unsub
  }, [])

  const handleChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    settingsStore.update({ [key]: value })
    showSuccessToast()
  }

  const showSuccessToast = () => {
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
  }

  const handleReset = () => {
    if (confirm('Barcha tizim sozlamalarini standart holatga qaytarasizmi?')) {
      settingsStore.resetDefaults()
      showSuccessToast()
    }
  }

  return (
    <div className="settings-view glass-card">
      {/* Toast Notification */}
      {savedToast && (
        <div className="settings-toast animate-fade-in">
          <Check size={16} />
          <span>Sozlamalar saqlandi!</span>
        </div>
      )}

      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-left">
          <div className="settings-icon-wrap">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="settings-title">Tizim Sozlamalari</h2>
            <p className="settings-sub">Kamera parametrlari, AI sezgirligi va xavfsizlik sozlamalari</p>
          </div>
        </div>

        <button className="btn-ghost" onClick={handleReset} style={{ fontSize: '0.78rem' }}>
          <RefreshCw size={13} /> Reset
        </button>
      </div>

      <div className="settings-sections">
        {/* SECTION 1: Camera & Video */}
        <div className="settings-card glass-card">
          <div className="card-header">
            <Camera size={16} className="card-icon" />
            <h3>Kamera va Video Parametrlari</h3>
          </div>
          <div className="card-body">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Video Aniqligi (Resolution)</span>
                <span className="setting-desc">Kamera tasvirining optimal ruxsat etilgan sifati</span>
              </div>
              <select
                className="setting-select"
                value={settings.cameraResolution}
                onChange={e => handleChange('cameraResolution', e.target.value as SystemSettings['cameraResolution'])}
              >
                <option value="720p">720p HD (Optimal)</option>
                <option value="1080p">1080p Full HD</option>
                <option value="4K">4K Ultra HD</option>
              </select>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Kadrlar Chastotasi (FPS)</span>
                <span className="setting-desc">Kamera sekundiga necha kadr uzatishi</span>
              </div>
              <select
                className="setting-select"
                value={settings.cameraFps}
                onChange={e => handleChange('cameraFps', Number(e.target.value))}
              >
                <option value={15}>15 FPS (Tejamkor)</option>
                <option value={30}>30 FPS (Standart)</option>
                <option value={60}>60 FPS (Yuqori tezlik)</option>
              </select>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Kamera Manbasi</span>
                <span className="setting-desc">Veb-kamera yoki IP/RTSP tarmoq kamerasi</span>
              </div>
              <select
                className="setting-select"
                value={settings.cameraSource}
                onChange={e => handleChange('cameraSource', e.target.value as SystemSettings['cameraSource'])}
              >
                <option value="webcam">O'rnatilgan Veb-kamera</option>
                <option value="ipcam">IP Kamera / RTSP Stream</option>
              </select>
            </div>

            {settings.cameraSource === 'ipcam' && (
              <div className="setting-row full-width">
                <div className="setting-info">
                  <span className="setting-label">IP Kamera RTSP URL</span>
                </div>
                <input
                  type="text"
                  className="setting-input"
                  placeholder="rtsp://admin:12345@192.168.1.100:554/stream"
                  value={settings.ipCameraUrl}
                  onChange={e => handleChange('ipCameraUrl', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: AI Sensitivity */}
        <div className="settings-card glass-card">
          <div className="card-header">
            <Sliders size={16} className="card-icon" />
            <h3>AI Deteksiya Sezgirligi</h3>
          </div>
          <div className="card-body">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Harakat Sezgirligi Shegarasi ({settings.motionSensitivity}%)</span>
                <span className="setting-desc">Piksel o'zgarishi necha foiz bo'lganda harakat deb baholanishi</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                className="setting-range"
                value={settings.motionSensitivity}
                onChange={e => handleChange('motionSensitivity', Number(e.target.value))}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Yuz Tanish Aniqligi ({settings.faceConfidence}%)</span>
                <span className="setting-desc">AI yuzni taniqli deb hisoblashi uchun moslik foizi</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                className="setting-range"
                value={settings.faceConfidence}
                onChange={e => handleChange('faceConfidence', Number(e.target.value))}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Voqealar Takrorlanishi Oralig'i</span>
                <span className="setting-desc">Harakat sodir bo'lganda yangi voqea yozish oralig'i</span>
              </div>
              <select
                className="setting-select"
                value={settings.detectionIntervalMs}
                onChange={e => handleChange('detectionIntervalMs', Number(e.target.value))}
              >
                <option value={5000}>5 Sekund</option>
                <option value={8000}>8 Sekund (Standart)</option>
                <option value={15000}>15 Sekund</option>
                <option value={30000}>30 Sekund</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: Google Gemini AI API */}
        <div className="settings-card glass-card">
          <div className="card-header">
            <Cpu size={16} className="card-icon" />
            <h3>Google Gemini AI Yordamchi Sozlamalari</h3>
          </div>
          <div className="card-body">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">AI Modeli</span>
                <span className="setting-desc">Ovozli va matnli so'rovlar uchun foydalaniladigan AI modeli</span>
              </div>
              <select
                className="setting-select"
                value={settings.geminiModel}
                onChange={e => handleChange('geminiModel', e.target.value as SystemSettings['geminiModel'])}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Tezkor)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Chuqur Tahlil)</option>
              </select>
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}
