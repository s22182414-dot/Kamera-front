/**
 * Chat Store — har bir kun uchun chat yozishmalarini alohida saqlash
 */

export interface ChatMessage {
  id: number
  date: string          // YYYY-MM-DD
  role: 'user' | 'assistant'
  text: string
  time: string
  image?: string        // Voqea snapshot rasmi (base64 yoki URL)
}

const CHAT_STORAGE_KEY = 'camai_chat_messages'

function loadChatMap(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveChatMap(map: Record<string, ChatMessage[]>) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(map))
  } catch (e) {
    console.warn('[ChatStore] Storage full error:', e)
  }
}

type ChatListener = (date: string, messages: ChatMessage[]) => void
const chatListeners = new Set<ChatListener>()

function notify(date: string) {
  const map = loadChatMap()
  const dateMsgs = map[date] || []
  chatListeners.forEach(l => l(date, dateMsgs))
}

export const chatStore = {
  /** Ma'lum sana uchun xabarlarni olish */
  getByDate(date: string): ChatMessage[] {
    const map = loadChatMap()
    if (!map[date]) {
      // Birinchi marta kirilganda salomlashish xabari
      const initialMsg: ChatMessage = {
        id: Date.now(),
        date,
        role: 'assistant',
        text: date === new Date().toISOString().split('T')[0]
          ? 'Salom! Men CamAI yordamchisiman. Bugungi kamera voqealari haqida savol berishingiz mumkin.'
          : `Salom! Siz ${date} sanasi muloqotidasiz. Ushbu kundagi yozuvlar va savollar alohida saqlanadi.`,
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      }
      map[date] = [initialMsg]
      saveChatMap(map)
    }
    return map[date]
  },

  /** Yangi xabar qo'shish */
  addMessage(date: string, msg: Omit<ChatMessage, 'id' | 'date'>): ChatMessage {
    const map = loadChatMap()
    if (!map[date]) map[date] = []

    const newMsg: ChatMessage = {
      ...msg,
      id: Date.now() + Math.random(),
      date,
    }

    map[date].push(newMsg)
    saveChatMap(map)
    notify(date)
    return newMsg
  },

  /** Suhbatni tozalash */
  clearDate(date: string) {
    const map = loadChatMap()
    delete map[date]
    saveChatMap(map)
    notify(date)
  },

  /** O'zgarishlarni tinglash */
  subscribe(listener: ChatListener): () => void {
    chatListeners.add(listener)
    return () => chatListeners.delete(listener)
  }
}
