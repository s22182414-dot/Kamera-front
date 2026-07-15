import { useEffect, useRef } from 'react'

// Katakana + latin + raqamlar — Matrix uslubida
const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*<>[]{}/\\'

interface Column {
  y: number       // joriy pozitsiya (qatorlarda)
  speed: number   // tezlik
  length: number  // "quyruq" uzunligi
}

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const FONT_SIZE = 15
    let w = 0
    let h = 0
    let cols = 0
    let columns: Column[] = []

    // Her ustun uchun ma'lumotlar massivi (qaysi belgilar ko'rsatilmoqda)
    let charMap: string[][] = []

    const init = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      cols = Math.floor(w / FONT_SIZE)

      columns = Array.from({ length: cols }, () => ({
        y: -Math.floor(Math.random() * 80),
        speed: 0.25 + Math.random() * 0.55,
        length: 8 + Math.floor(Math.random() * 20),
      }))

      charMap = Array.from({ length: cols }, () =>
        Array.from({ length: Math.ceil(h / FONT_SIZE) + 30 }, () =>
          CHARS[Math.floor(Math.random() * CHARS.length)]
        )
      )
    }

    init()
    window.addEventListener('resize', init)

    let animId: number
    let frame = 0

    const draw = () => {
      frame++

      // Fon — hafif qoraytirish (trail effekti)
      ctx.fillStyle = 'rgba(4, 4, 11, 0.06)'
      ctx.fillRect(0, 0, w, h)

      ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`

      for (let i = 0; i < cols; i++) {
        const col = columns[i]
        const x = i * FONT_SIZE

        // "Quyruq" ni chizish — past yorqinlikdan yuqori yorqinlikka
        for (let j = 0; j < col.length; j++) {
          const rowIndex = Math.floor(col.y) - j
          if (rowIndex < 0) continue

          const y = rowIndex * FONT_SIZE
          if (y > h) continue

          // Char — har 3-4 frameda o'zgaradi
          if (frame % 3 === 0 && Math.random() > 0.85) {
            charMap[i][rowIndex] = CHARS[Math.floor(Math.random() * CHARS.length)]
          }
          const char = charMap[i][rowIndex] ?? '0'

          // Rang: bosh belgi → porloq oq, quyruq → neon cyan → o'chib boradi
          if (j === 0) {
            // Bosh — eng yorqin, deyarli oq
            ctx.fillStyle = '#e0f7ff'
            ctx.globalAlpha = 0.95
          } else if (j < 3) {
            // Ikkinchi qism — neon cyan
            ctx.fillStyle = '#00d4ff'
            ctx.globalAlpha = 0.85 - j * 0.1
          } else if (j < 8) {
            // O'rta — ko'k-yashil
            ctx.fillStyle = '#0891b2'
            ctx.globalAlpha = 0.6 - (j - 3) * 0.08
          } else {
            // Quyruq — qorayib ketadi
            ctx.fillStyle = '#0e4c6a'
            ctx.globalAlpha = Math.max(0.05, 0.3 - (j - 8) * 0.025)
          }

          ctx.fillText(char, x, y)
        }

        // Ustunni pastga siljitish
        col.y += col.speed

        // Pastdan chiqib ketsa — qayta boshdan
        if (col.y * FONT_SIZE > h + col.length * FONT_SIZE) {
          col.y = -Math.floor(Math.random() * 40)
          col.speed = 0.25 + Math.random() * 0.55
          col.length = 8 + Math.floor(Math.random() * 20)
        }
      }

      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', init)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        display: 'block',
      }}
    />
  )
}
