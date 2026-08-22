/**
 * Shrink a camera photo before it leaves the phone. Jobsite photos are
 * reference material — "which breaker box", "the rusted union" — looked at
 * on a phone or iPad, so 1600px is plenty and a 4MB HEIC becomes ~250KB.
 * That is the difference between "uploaded before the truck door shuts" and
 * watching a spinner on one bar of LTE.
 *
 * If the browser cannot decode the file (HEIC off-Safari, odd formats), the
 * original uploads unchanged — slower, never dropped.
 */
const MAX_EDGE = 1600
const QUALITY = 0.78

export async function compressPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    // Only swap when it actually helped — tiny PNG screenshots can grow.
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    return file
  }
}
