import './CameraPanel.css'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, CameraOff, Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import { eventsStore } from '../store/eventsStore'
import { personsStore } from '../store/personsStore'
import { settingsStore, type SystemSettings } from '../store/settingsStore'

function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const audioCtx = new AudioContextClass()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.15)
  } catch {}
}

const RES_MAP = {
  '720p':  { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4K':    { width: 3840, height: 2160 },
}

export default function CameraPanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevFrameRef = useRef<ImageData | null>(null)
  const detectionRef = useRef<number | null>(null)

  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [motionDetected, setMotionDetected] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [settings, setSettings] = useState<SystemSettings>(() => settingsStore.get())

  useEffect(() => {
    return settingsStore.subscribe(setSettings)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!panelRef.current) return
    if (!document.fullscreenElement) {
      panelRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error('Fullscreen failure:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch((err) => {
        console.error('Exit fullscreen error:', err)
      })
    }
  }, [])

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFSChange)
    return () => document.removeEventListener('fullscreenchange', handleFSChange)
  }, [])

  // ─── Real-time Motion Detection using Settings ─────
  const startMotionDetection = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let lastEventTime = 0

    const detect = () => {
      if (!video.videoWidth) { detectionRef.current = requestAnimationFrame(detect); return }

      canvas.width  = 160
      canvas.height = 90
      ctx.drawImage(video, 0, 0, 160, 90)

      const frame = ctx.getImageData(0, 0, 160, 90)

      if (prevFrameRef.current) {
        const prev = prevFrameRef.current.data
        const curr = frame.data
        let diff = 0

        for (let i = 0; i < curr.length; i += 4) {
          diff += Math.abs(curr[i] - prev[i]) + Math.abs(curr[i+1] - prev[i+1]) + Math.abs(curr[i+2] - prev[i+2])
        }

        const pct = diff / (160 * 90 * 3 * 255) * 100

        // Real-time Motion threshold check from system settings
        if (pct > settings.motionSensitivity) {
          setMotionDetected(true)
          const now = Date.now()

          // Real-time Cooldown check from system settings
          if (now - lastEventTime > settings.detectionIntervalMs) {
            lastEventTime = now

            // Ovozli signal (agar Sozlamalardan yoqilgan bo'lsa)
            if (settings.soundAlerts) {
              playAlertChime()
            }

            // High resolution frame snapshot
            const snapCanvas = document.createElement('canvas')
            snapCanvas.width = 320
            snapCanvas.height = 240
            const snapCtx = snapCanvas.getContext('2d')
            let snapBase64 = ''
            if (snapCtx && video) {
              snapCtx.drawImage(video, 0, 0, 320, 240)
              snapBase64 = snapCanvas.toDataURL('image/jpeg', 0.8)
            }

            eventsStore.addEvent({ type: 'motion', imageData: snapBase64 })
            if (snapBase64) {
              personsStore.addAutoCapturedFace(snapBase64)
            }
          }
          setTimeout(() => setMotionDetected(false), 1500)
        }
      }

      prevFrameRef.current = frame
      detectionRef.current = requestAnimationFrame(detect)
    }

    detectionRef.current = requestAnimationFrame(detect)
  }, [settings.motionSensitivity, settings.detectionIntervalMs, settings.soundAlerts])

  const stopMotionDetection = useCallback(() => {
    if (detectionRef.current) cancelAnimationFrame(detectionRef.current)
    prevFrameRef.current = null
  }, [])

  // ─── Real-time Camera startup with settings Resolution & FPS ───
  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const resConf = RES_MAP[settings.cameraResolution] || RES_MAP['720p']
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: resConf.width },
          height: { ideal: resConf.height },
          frameRate: { ideal: settings.cameraFps },
          facingMode: 'user'
        },
        audio: false
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsActive(true)
        eventsStore.addEvent({ type: 'motion' })
        setTimeout(startMotionDetection, 1000)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kamera topilmadi'
      setError(`Kamera ulanmadi: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }, [settings.cameraResolution, settings.cameraFps, startMotionDetection])

  const stopCamera = useCallback(() => {
    stopMotionDetection()
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsActive(false)
    setMotionDetected(false)
  }, [stopMotionDetection])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div
      ref={panelRef}
      className={`camera-panel glass-card ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* Header */}
      <div className="camera-header">
        <div className="camera-header-left">
          <div className="camera-icon-wrap">
            <Camera size={16} />
          </div>
          <div>
            <h2 className="camera-title">Live Kamera</h2>
            <p className="camera-sub">
              {isActive
                ? `${settings.cameraResolution} HD • ${settings.cameraFps} FPS (${settings.motionSensitivity}% Sezgirlik)`
                : 'Asosiy kamera oqimi'}
            </p>
          </div>
        </div>

        <div className="camera-header-right">
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
              disabled={!isActive || zoom <= 1}
              title="Kichiklashtirish"
            >
              <ZoomOut size={14} />
            </button>
            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
            <button
              className="zoom-btn"
              onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
              disabled={!isActive || zoom >= 2.5}
              title="Kattalashtirish"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <button
            className="cam-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Kichiklashtirish" : "To'liq ekranga o'tish"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="camera-viewport-container">
        <div className="camera-viewport">
          <video
            ref={videoRef}
            className="camera-video"
            playsInline
            muted
            style={{
              transform: `scale(${zoom})`,
              display: isActive ? 'block' : 'none',
            }}
          />

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!isActive && (
            <div className="camera-placeholder">
              {isLoading ? (
                <div className="camera-loading">
                  <RefreshCw size={36} className="spin-icon" />
                  <p>Kamera yuklanmoqda...</p>
                </div>
              ) : error ? (
                <div className="camera-error">
                  <CameraOff size={40} />
                  <p>{error}</p>
                  <button className="btn-primary" onClick={startCamera}>
                    Qayta Urinish
                  </button>
                </div>
              ) : (
                <div className="camera-off-state">
                  <div className="camera-big-icon">
                    <Camera size={44} strokeWidth={1.5} />
                  </div>
                  <p className="camera-off-text">Kamerani yoqish uchun bosing</p>
                  <button className="btn-primary camera-start-btn" onClick={startCamera}>
                    <Camera size={16} /> Kamerani Yoqish
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Indicators */}
          {isActive && (
            <>
              <div className="camera-badge live-badge">
                <span className="live-pulse" /> LIVE
              </div>
              <div className="camera-badge res-badge">
                {settings.cameraResolution} HD
              </div>
              {motionDetected && (
                <div className="camera-badge motion-badge animate-pulse">
                  ⚡ HARAKAT ANIQLANDI
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="camera-footer">
        <div className="camera-footer-left">
          {isActive ? (
            <button className="btn-danger-outline" onClick={stopCamera}>
              <CameraOff size={15} /> O'chirish
            </button>
          ) : (
            <button className="btn-primary" onClick={startCamera} disabled={isLoading}>
              <Camera size={15} /> Yoqish
            </button>
          )}
        </div>

        <div className="camera-footer-right">
          <span className="cam-meta-tag">{settings.cameraResolution}</span>
          <span className="cam-meta-tag">{settings.cameraFps}fps</span>
          <span className="cam-meta-tag">
            {isActive ? 'Ishlamoqda' : "To'xtatilgan"}
          </span>
        </div>
      </div>
    </div>
  )
}
