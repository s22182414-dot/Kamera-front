import './Login.css'
import { useState, useEffect } from 'react'
import { Shield, Eye, EyeOff, Camera, Cpu, Lock, Wifi } from 'lucide-react'
import MatrixRain from '../components/MatrixRain'

interface LoginProps {
  onLogin: (password: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 900))
    if (password === 'admin123') {
      localStorage.setItem('camai_token', 'authenticated')
      onLogin(password)
    } else {
      setError('Noto\'g\'ri parol. Qaytadan urinib ko\'ring.')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Matrix Rain — full screen canvas */}
      <MatrixRain />

      {/* Dark overlay above matrix */}
      <div className="matrix-overlay" />

      {/* Main content */}
      <div className={`login-content ${mounted ? 'content-visible' : ''}`}>
        {/* Badge */}
        <div className="login-badge">
          <Wifi size={12} />
          <span>Xavfsiz kanal • TLS 1.3</span>
          <span className="badge-dot" />
        </div>

        {/* Brand */}
        <div className="login-brand">
          <div className="brand-icon">
            <Shield size={24} strokeWidth={1.5} />
          </div>
          <h1 className="brand-name">CamAI</h1>
        </div>

        <p className="login-headline">
          Aqlli Kuzatish<br />
          <span className="headline-accent">Tizimiga Xush Kelibsiz</span>
        </p>

        {/* Card */}
        <div className="login-card">
          <div className="card-glow" />

          <p className="card-label">
            <Lock size={12} />
            Himoyalangan kirish
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <div className="input-icon">
                <Lock size={14} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Parolni kiriting..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="input-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <div className="login-error animate-fade-in">
                <span className="error-bar" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={loading || !password.trim()}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="btn-spinner" />
                  Tekshirilmoqda...
                </span>
              ) : (
                <span className="btn-text">
                  <Shield size={15} />
                  Tizimga Kirish
                </span>
              )}
              <span className="btn-shine" />
            </button>
          </form>

          <div className="card-features">
            <div className="feature-tag">
              <Camera size={12} />
              Live kamera
            </div>
            <div className="feature-tag">
              <Cpu size={12} />
              AI tahlil
            </div>
            <div className="feature-tag">
              <Shield size={12} />
              Xavfsiz
            </div>
          </div>
        </div>

        <p className="login-copyright">© 2024 CamAI Security Systems</p>
      </div>
    </div>
  )
}
