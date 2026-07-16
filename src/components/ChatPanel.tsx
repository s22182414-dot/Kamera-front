import './ChatPanel.css'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Clock, Calendar, ChevronLeft, ChevronRight, X, Eye, Mic, MicOff, Volume2 } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { eventsStore } from '../store/eventsStore'
import { chatStore, type ChatMessage } from '../store/chatStore'

interface ResponsePayload {
  reply: string
  image?: string
}

function getFormattedDateText(dateStr: string, formatType: 'sanasida' | 'kuni' | 'sanasidagi'): string {
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateStr === todayStr) {
    if (formatType === 'sanasidagi') return 'bugungi'
    return 'bugun'
  } else if (dateStr === yesterdayStr) {
    if (formatType === 'sanasidagi') return 'kechagi'
    return 'kecha'
  } else {
    if (formatType === 'sanasida') return `${dateStr} sanasida`
    if (formatType === 'kuni') return `${dateStr} kuni`
    return `${dateStr} sanasidagi`
  }
}

function getResponse(text: string, selectedDate: string): ResponsePayload {
  const lower = text.toLowerCase()
  const dayEvents = eventsStore.getByDate(selectedDate)

  if (dayEvents.length === 0) {
    return {
      reply: `📅 ${getFormattedDateText(selectedDate, 'sanasida')} kamera tomonidan hech qanday voqea yoki harakat qayd etilmagan.`
    }
  }

  // Find latest event with captured snapshot
  const eventWithImage = [...dayEvents].reverse().find(e => !!e.imageData)
  const latestSnapshot = eventWithImage?.imageData

  const known = dayEvents.filter(e => e.type === 'face_known')
  const unknown = dayEvents.filter(e => e.type === 'face_unknown')
  const motion = dayEvents.filter(e => e.type === 'motion')

  if (lower.includes('kim')) {
    const names = Array.from(new Set(known.map(e => e.person).filter(Boolean))).join(', ')
    return {
      reply: names
        ? `${getFormattedDateText(selectedDate, 'kuni')} quyidagi taniqli shaxslar kelgan: ${names}. Jami ${known.length} kishi.`
        : `${getFormattedDateText(selectedDate, 'kuni')} taniqli shaxslar tashrifi qayd etilmadi. (Kamerada tushgan noma'lum shaxslar: ${unknown.length} ta).`,
      image: latestSnapshot
    }
  }

  if (lower.includes('rasm') || lower.includes('surat') || lower.includes('harakat') || lower.includes('ko\'rsat') || lower.includes('korsat') || lower.includes('oxirgi')) {
    const lastEvent = dayEvents[dayEvents.length - 1]
    return {
      reply: `📸 ${getFormattedDateText(selectedDate, 'sanasidagi')} oxirgi kamera snapshot kadr rasmi (${lastEvent?.time || ''}):`,
      image: lastEvent?.imageData || latestSnapshot
    }
  }

  if (lower.includes('keldi') || lower.includes('tashrif') || lower.includes('nechta')) {
    return {
      reply: `${getFormattedDateText(selectedDate, 'kuni')} jami ${dayEvents.length} ta voqea qayd etilgan: ${known.length} ta taniqli, ${unknown.length} ta noma'lum va ${motion.length} ta harakat.`,
      image: latestSnapshot
    }
  }

  const names = Array.from(new Set(known.map(e => e.person).filter(Boolean))).join(', ')
  return {
    reply: `📅 ${getFormattedDateText(selectedDate, 'sanasidagi')} kamera yozuvlari tahlili:\n` +
      `• Jami voqealar: ${dayEvents.length} ta\n` +
      `• Taniqli shaxslar: ${known.length} ta${names ? ` (${names})` : ''}\n` +
      `• Noma'lum shaxslar: ${unknown.length} ta\n` +
      `• Harakatlar: ${motion.length} ta`,
    image: latestSnapshot
  }
}

const SUGGESTIONS = [
  'Bugun kimlar keldi?',
  'Oxirgi harakat rasmini ko\'rsat',
  'Ushbu kunda nechta kishi keldi?',
  'Voqealar hisoboti',
]

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
]

const WEEKDAYS = ['Dsh', 'Ssh', 'Chr', 'Psh', 'Jum', 'Shn', 'Yak']

export default function ChatPanel() {
  const allEvents = useEvents()
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [messages, setMessages] = useState<ChatMessage[]>(() => chatStore.getByDate(todayStr))
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [currDate, setCurrDate] = useState(new Date())
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const calBtnRef = useRef<HTMLButtonElement>(null)

  const recordedDates = new Set(allEvents.map(e => e.date))

  useEffect(() => {
    setMessages(chatStore.getByDate(selectedDate))
  }, [selectedDate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

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

  const speakText = async (rawText: string) => {
    window.speechSynthesis?.cancel()

    // Clean text: remove emojis, bullet chars, extra whitespace
    const cleanText = rawText
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[•·▪▸►]/g, ',')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (!cleanText) return
    setIsSpeaking(true)

    // Try backend Google Translate TTS (natural Uzbek voice)
    try {
      const url = `http://localhost:8000/api/tts?text=${encodeURIComponent(cleanText)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error('TTS backend error')
      const blob = await resp.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl) }
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl) }
      await audio.play()
      return
    } catch {
      // Fallback: browser SpeechSynthesis — Uzbek voice ONLY
    }

    if (!window.speechSynthesis) { setIsSpeaking(false); return }

    const doSpeak = (voices: SpeechSynthesisVoice[]) => {
      // Only Uzbek voices — never Russian
      const pick =
        voices.find(v => v.lang.startsWith('uz') && v.name.toLowerCase().includes('google')) ||
        voices.find(v => v.lang.startsWith('uz')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        null

      const utter = new SpeechSynthesisUtterance(cleanText)
      if (pick) { utter.voice = pick; utter.lang = pick.lang }
      else { utter.lang = 'uz-UZ' }
      utter.rate = 0.9
      utter.pitch = 1.0
      utter.volume = 1
      utter.onend = () => setIsSpeaking(false)
      utter.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utter)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      doSpeak(voices)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak(window.speechSynthesis.getVoices())
      }
    }
  }

  const startVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      alert('Brauzeringiz ovozli kiritishni qo\'llamaydi.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionAPI()
    recognition.lang = 'uz-UZ'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript
      // Auto-send immediately after speech is captured
      sendMessage(transcript)
    }

    recognition.start()
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    const time = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    chatStore.addMessage(selectedDate, { role: 'user', text: text.trim(), time })
    setMessages(chatStore.getByDate(selectedDate))
    setInput('')
    setIsTyping(true)

    await new Promise(r => setTimeout(r, 600 + Math.random() * 400))

    const response = getResponse(text, selectedDate)
    const aiTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })

    chatStore.addMessage(selectedDate, {
      role: 'assistant',
      text: response.reply,
      image: response.image,
      time: aiTime
    })

    setMessages(chatStore.getByDate(selectedDate))
    setIsTyping(false)
    await speakText(response.reply)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr)
    setShowCalendar(false)
  }

  const year = currDate.getFullYear()
  const month = currDate.getMonth()
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

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
    <div className="chat-panel glass-card">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-ai-icon">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="chat-title">AI Yordamchi</h2>
            <p className="chat-sub">
              {selectedDate === todayStr
                ? '📅 Bugun (Jonli)'
                : selectedDate === (() => { const y = new Date(); y.setDate(y.getDate()-1); return y.toISOString().split('T')[0] })()
                ? '📅 Kecha'
                : `📅 Sana: ${selectedDate}`}
            </p>
          </div>
        </div>
        <div className="chat-header-right">
          <div className="chat-status-dot" />
          <button
            ref={calBtnRef}
            className={`cam-btn ${showCalendar || selectedDate !== todayStr ? 'active-btn' : ''}`}
            onClick={() => setShowCalendar(prev => !prev)}
            title="Sana bo'yicha yozishmalarni alohida ochish"
          >
            <Calendar size={15} />
            {recordedDates.size > 0 && <span className="cal-dot-badge" />}
          </button>
        </div>
      </div>

      {/* Calendar Popover */}
      {showCalendar && (
        <div className="calendar-popover animate-fade-in" ref={popoverRef}>
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
                <ChevronRight size={14} />
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
                  title={hasEvents ? `${item.dateStr}: Yozishmalar hamda ${item.eventCount} ta voqea` : `${item.dateStr}: Ma'lumot yo'q`}
                >
                  <span>{item.day}</span>
                  {hasEvents && <span className="day-record-dot" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble-wrap ${msg.role === 'user' ? 'user-wrap' : 'ai-wrap'} animate-fade-in`}
          >
            <div className={`chat-avatar ${msg.role === 'user' ? 'user-avatar' : 'ai-avatar'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="chat-bubble-content">
              <div className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>

                {/* Attached Event Snapshot Image */}
                {msg.image && (
                  <div
                    className="chat-media-wrap"
                    onClick={() => setPreviewImage(msg.image || null)}
                    title="Rasmni kattalashtirib ko'rish uchun bosing"
                  >
                    <img src={msg.image} alt="Kamera Snapshot" className="chat-media-img" />
                    <div className="media-overlay">
                      <Eye size={16} />
                    </div>
                  </div>
                )}
              </div>
              <span className="chat-time">
                <Clock size={10} /> {msg.time}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="chat-bubble-wrap ai-wrap animate-fade-in">
            <div className="chat-avatar ai-avatar">
              <Bot size={14} />
            </div>
            <div className="chat-bubble-content">
              <div className="chat-bubble bubble-ai typing-bubble">
                <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                <span className="typing-dot" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="chat-suggestions">
        {SUGGESTIONS.map(s => (
          <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="chat-input-wrap">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder={
            isListening
              ? '🎙️ Tinglayapman...'
              : isSpeaking
              ? '🔊 AI javob beryapti...'
              : selectedDate === todayStr
              ? 'Bugungi kamera haqida savol bering...'
              : `${getFormattedDateText(selectedDate, 'sanasidagi')} suhbat...`
          }
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isListening}
        />
        {isSpeaking && (
          <button
            className="chat-speaking-btn"
            onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false) }}
            title="Ovozni to'xtatish"
          >
            <Volume2 size={16} />
            <span className="voice-ripple" />
          </button>
        )}
        <button
          className={`chat-voice-btn ${isListening ? 'listening' : ''}`}
          onClick={startVoiceInput}
          title={isListening ? 'Ovoz yozishni to\'xtatish' : 'Ovozli savol berish'}
          disabled={isTyping || isSpeaking}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          {isListening && <span className="voice-ripple" />}
        </button>
        <button
          className={`chat-send-btn ${input.trim() ? 'active' : ''}`}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping || isListening}
        >
          <Send size={16} />
        </button>
      </div>

      {/* Full-Screen Image Lightbox Preview Modal */}
      {previewImage && (
        <div className="chat-lightbox-backdrop animate-fade-in" onClick={() => setPreviewImage(null)}>
          <div className="chat-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="chat-lightbox-close" onClick={() => setPreviewImage(null)}>
              <X size={18} />
            </button>
            <img src={previewImage} alt="Large View" className="chat-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  )
}
