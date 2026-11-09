import { useEffect, useRef } from 'react'
import { DOG_H, DOG_STILL, DOG_TIMELINE, DOG_W, dogFrame, type Frame } from '../lib/pixelDog'

const FRAME_MS = 110
let frames: Frame[] | null = null
let still: Frame | null = null

function draw(canvas: HTMLCanvasElement, frame: Frame, scale: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const px = scale * dpr
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (let y = 0; y < DOG_H; y++) {
    const row = frame[y]!
    for (let x = 0; x < DOG_W; x++) {
      const c = row[x]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(x * px, y * px, px, px)
    }
  }
}

/**
 * O Milo em pixel art, de frente, parado como um personagem de RPG: abana o rabinho, respira e pisca.
 * Desenhado num canvas, sem arquivos. Com "reduzir movimento" ligado no celular, fica parado.
 */
export function PixelDog({ scale = 4, label = 'Milo abanando o rabinho' }: { scale?: number; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = DOG_W * scale * dpr
    canvas.height = DOG_H * scale * dpr
    frames ??= DOG_TIMELINE.map(dogFrame)
    still ??= dogFrame(DOG_STILL)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      draw(canvas, still, scale)
      return
    }
    const all = frames
    let i = 0
    draw(canvas, all[0]!, scale)
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      i = (i + 1) % all.length
      draw(canvas, all[i]!, scale)
    }, FRAME_MS)
    return () => window.clearInterval(id)
  }, [scale])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      style={{ width: DOG_W * scale, height: DOG_H * scale, imageRendering: 'pixelated' }}
    />
  )
}
