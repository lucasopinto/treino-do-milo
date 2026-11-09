/** Reduz a foto para no máximo `max` px e devolve um JPEG em data URL (fica leve no banco e no backup). */
export async function resizeImage(file: File, max = 512, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Não foi possível abrir a imagem.'))
      i.src = url
    })
    // Recorte quadrado centralizado (a foto aparece redonda).
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const size = Math.min(max, side)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a imagem.')
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
