import './PersonsView.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Users, UserPlus, Search, Trash2, Camera, Upload, X, Check, ShieldCheck, Tag, Sparkles } from 'lucide-react'
import { personsStore, type KnownPerson } from '../store/personsStore'
import { useEvents } from '../hooks/useEvents'

const ROLE_LABELS: Record<KnownPerson['role'], { label: string; color: string }> = {
  employee: { label: 'Xodim', color: 'blue' },
  family:   { label: "Oila a'zosi", color: 'cyan' },
  guest:    { label: 'Mehmon', color: 'green' },
  vip:      { label: 'VIP', color: 'purple' },
  captured: { label: "Kamera Tushirgan Yuz", color: 'amber' }
}

export default function PersonsView() {
  const allEvents = useEvents()
  const [persons, setPersons] = useState<KnownPerson[]>([])
  const [search, setSearch] = useState('')
  const [selectedTab, setSelectedTab] = useState<'all' | 'registered' | 'captured'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [role, setRole] = useState<KnownPerson['role']>('employee')
  const [photo, setPhoto] = useState<string>('')
  const [isCameraActive, setIsCameraActive] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const unsub = personsStore.subscribe(setPersons)
    return unsub
  }, [])

  // Start webcam inside modal
  const startModalCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsCameraActive(true)
      }
    } catch (e) {
      console.error('Modal camera error:', e)
      alert('Kamera ulanmadi!')
    }
  }, [])

  const stopModalCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  const snapPhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 300
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const v = videoRef.current
      const minDim = Math.min(v.videoWidth, v.videoHeight)
      const startX = (v.videoWidth - minDim) / 2
      const startY = (v.videoHeight - minDim) / 2
      ctx.drawImage(v, startX, startY, minDim, minDim, 0, 0, 300, 300)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setPhoto(dataUrl)
      stopModalCamera()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setPhoto(evt.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const handlePromoteCaptured = (person: KnownPerson) => {
    setEditingPersonId(person.id)
    setName('')
    setRole('employee')
    setPhoto(person.photo)
    setShowModal(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return alert('Ism sharifni kiriting!')
    if (!photo) return alert("Rasm oling yoki fayl yuklang!")

    if (editingPersonId) {
      personsStore.updatePerson(editingPersonId, { name, role })
    } else {
      personsStore.addPerson({ name, role, photo })
    }

    setShowModal(false)
    resetForm()
  }

  const resetForm = () => {
    setName('')
    setRole('employee')
    setPhoto('')
    setEditingPersonId(null)
    stopModalCamera()
  }

  const handleDelete = (id: string, personName: string) => {
    if (confirm(`${personName} ma'lumotini ro'yxatdan o'chirasizmi?`)) {
      personsStore.deletePerson(id)
    }
  }

  // Filter logic
  const filtered = persons.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())

    let matchTab = true
    if (selectedTab === 'registered') matchTab = !p.isAutoCaptured && p.role !== 'captured'
    if (selectedTab === 'captured') matchTab = !!p.isAutoCaptured || p.role === 'captured'

    const matchRole = selectedRole === 'all' || p.role === selectedRole

    return matchSearch && matchTab && matchRole
  })

  const capturedCount = persons.filter(p => p.isAutoCaptured || p.role === 'captured').length
  const registeredCount = persons.length - capturedCount

  return (
    <div className="persons-view glass-card">
      {/* Header */}
      <div className="persons-header">
        <div className="persons-header-left">
          <div className="persons-icon-wrap">
            <Users size={18} />
          </div>
          <div>
            <h2 className="persons-title">Shaxslar va Avto-Snapshotlar</h2>
            <p className="persons-sub">Kamera tomonidan tushirilgan barcha yuzlar hamda ro'yxatga olingan shaxslar</p>
          </div>
        </div>

        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <UserPlus size={16} /> Yangi Shaxs Qo'shish
        </button>
      </div>

      {/* Main Tabs & Controls */}
      <div className="persons-tabs-bar">
        <div className="main-tabs">
          <button
            className={`tab-link ${selectedTab === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedTab('all')}
          >
            Barcha Yuzlar ({persons.length})
          </button>
          <button
            className={`tab-link ${selectedTab === 'registered' ? 'active' : ''}`}
            onClick={() => setSelectedTab('registered')}
          >
            👥 Taniqli Shaxslar ({registeredCount})
          </button>
          <button
            className={`tab-link ${selectedTab === 'captured' ? 'active' : ''}`}
            onClick={() => setSelectedTab('captured')}
          >
            📸 Kamera Tushirgan Yuzlar ({capturedCount})
          </button>
        </div>

        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Shaxs ismi yoki vaqti bo'yicha..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Persons Grid */}
      <div className="persons-grid">
        {filtered.length === 0 ? (
          <div className="persons-empty">
            <Sparkles size={36} strokeWidth={1.5} />
            <h3>Ushbu Toifada Yuzlar Yo'q</h3>
            <p>Live Kamera yoqilganda har bir ko'ringan odamning yuz snapshot avtomatik bu yerda paydo bo'ladi</p>
          </div>
        ) : (
          filtered.map(person => {
            const roleInfo = ROLE_LABELS[person.role] || ROLE_LABELS.captured
            const visits = allEvents.filter(e => e.person === person.name).length
            const isCap = person.isAutoCaptured || person.role === 'captured'

            return (
              <div key={person.id} className={`person-card glass-card animate-fade-in ${isCap ? 'is-auto-captured' : ''}`}>
                <div className="person-avatar-wrap">
                  {person.photo ? (
                    <img src={person.photo} alt={person.name} className="person-avatar-img" />
                  ) : (
                    <div className="person-avatar-placeholder">
                      <Camera size={24} />
                    </div>
                  )}
                  <span className={`person-role-badge role-${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>

                <div className="person-info">
                  <h3 className="person-name">{person.name}</h3>
                  <div className="person-stats">
                    <span className="person-visits">
                      <ShieldCheck size={13} /> {isCap ? 'Avto-tutilgan snapshot' : `${visits} ta tashrif`}
                    </span>
                  </div>

                  {isCap && (
                    <button
                      className="btn-promote"
                      onClick={() => handlePromoteCaptured(person)}
                    >
                      <Tag size={12} /> Ism Berish
                    </button>
                  )}
                </div>

                <button
                  className="person-delete-btn"
                  onClick={() => handleDelete(person.id, person.name)}
                  title="O'chirish"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Add / Edit Person Modal */}
      {showModal && (
        <div className="modal-backdrop animate-fade-in">
          <div className="modal-card glass-card">
            <div className="modal-header">
              <h3>
                <UserPlus size={18} />
                {editingPersonId ? "Tushirilgan Yuzga Ism Berish" : "Yangi Shaxs Qo'shish"}
              </h3>
              <button className="modal-close-btn" onClick={() => { setShowModal(false); resetForm(); }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              {/* Photo Section */}
              <div className="modal-photo-section">
                {photo ? (
                  <div className="photo-preview-wrap">
                    <img src={photo} alt="Preview" className="photo-preview" />
                    {!editingPersonId && (
                      <button type="button" className="btn-change-photo" onClick={() => setPhoto('')}>
                        Qayta Olish
                      </button>
                    )}
                  </div>
                ) : isCameraActive ? (
                  <div className="camera-modal-view">
                    <video ref={videoRef} className="camera-modal-video" autoPlay playsInline muted />
                    <button type="button" className="btn-snap" onClick={snapPhoto}>
                      <Camera size={16} /> Rasmga Olish
                    </button>
                  </div>
                ) : (
                  <div className="photo-actions-box">
                    <button type="button" className="btn-option" onClick={startModalCamera}>
                      <Camera size={20} />
                      <span>Kameradan Olish</span>
                    </button>
                    <label className="btn-option upload-option">
                      <Upload size={20} />
                      <span>Fayl Yuklash</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="form-group">
                <label>Ism Sharif</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masalan: Jasur Alimov"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Shaxs Maqomi (Role)</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={e => setRole(e.target.value as KnownPerson['role'])}
                >
                  <option value="employee">Xodim</option>
                  <option value="family">Oila a'zosi</option>
                  <option value="guest">Mehmon</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => { setShowModal(false); resetForm(); }}>
                  Bekor Qilish
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={15} /> Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
