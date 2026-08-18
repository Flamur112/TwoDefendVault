import {
  IMAGE_MAX_INPUT_BYTES,
  IMAGE_MAX_OUTPUT_BYTES,
  IMAGE_MAX_UPLOAD_BYTES,
  IMAGE_MAX_WIDTH,
  formatFileSize,
  imageInputLimitMessage,
} from '~/utils/image-limits'

const JPEG_QUALITY = 0.85
const JPEG_QUALITY_FALLBACK = 0.75

export type ImageUploadStatus = 'checking' | 'compressing' | 'uploading'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read that image.'))
    }
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.readAsDataURL(file)
  })
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image.'))
    img.src = dataUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not process image.'))
      },
      type,
      quality,
    )
  })
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp)$/i.test(file.name)
}

function outputName(file: File, mime: string): string {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  const ext = mime === 'image/png'
    ? 'png'
    : mime === 'image/webp'
      ? 'webp'
      : mime === 'image/gif'
        ? 'gif'
        : 'jpg'
  return `${base}.${ext}`
}

export function validateImageFile(file: File): void {
  if (!isImageFile(file)) {
    throw new Error('Please choose an image file (PNG, JPEG, WebP, or GIF).')
  }
  if (file.type === 'image/svg+xml') {
    throw new Error('SVG files are not supported. Use PNG or JPEG.')
  }
  if (file.size > IMAGE_MAX_INPUT_BYTES) {
    throw new Error(`Image is too large (${formatFileSize(file.size)}). ${imageInputLimitMessage()}`)
  }
}

async function compressImageToBlob(file: File): Promise<{ blob: Blob, mime: string }> {
  const sourceDataUrl = await readFileAsDataUrl(file)
  const img = await loadImageFromDataUrl(sourceDataUrl)
  const scale = Math.min(1, IMAGE_MAX_WIDTH / img.width)
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image.')

  ctx.drawImage(img, 0, 0, width, height)

  const keepPng = file.type === 'image/png' || file.type === 'image/webp'
  if (keepPng) {
    const pngBlob = await canvasToBlob(canvas, 'image/png')
    if (pngBlob.size <= IMAGE_MAX_OUTPUT_BYTES) {
      return { blob: pngBlob, mime: 'image/png' }
    }
  }

  let blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
  if (blob.size > IMAGE_MAX_OUTPUT_BYTES) {
    blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY_FALLBACK)
  }
  if (blob.size > IMAGE_MAX_OUTPUT_BYTES) {
    throw new Error(
      `Image is still too large after compression (${formatFileSize(blob.size)}). Try a smaller or simpler image. ${imageInputLimitMessage()}`,
    )
  }

  return { blob, mime: 'image/jpeg' }
}

export async function uploadImageForMarkdown(
  clientId: string,
  file: File,
  onStatus?: (status: ImageUploadStatus) => void,
): Promise<string> {
  onStatus?.('checking')
  validateImageFile(file)

  onStatus?.('compressing')
  const { blob, mime } = await compressImageToBlob(file)

  if (blob.size > IMAGE_MAX_UPLOAD_BYTES) {
    throw new Error(
      `Compressed image is still too large (${formatFileSize(blob.size)}). ${imageInputLimitMessage()}`,
    )
  }

  onStatus?.('uploading')
  const form = new FormData()
  form.append('file', blob, outputName(file, mime))

  const { url } = await $fetch<{ url: string }>(`/api/clients/${clientId}/documents/images`, {
    method: 'POST',
    body: form,
  })

  const alt = file.name.replace(/\.[^.]+$/, '') || 'image'
  return `\n![${alt}](${url})\n`
}
