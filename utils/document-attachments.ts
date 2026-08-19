export interface DocumentAttachment {
  id: string
  name: string
  mime: string
  size: number
  uploadedAt?: string
}

export const DOCUMENT_ATTACHMENTS_KEY = 'attachments'

export function parseDocumentAttachments(metadata: Record<string, string>): DocumentAttachment[] {
  const raw = metadata[DOCUMENT_ATTACHMENTS_KEY]
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed.filter((entry): entry is DocumentAttachment =>
      !!entry
      && typeof entry === 'object'
      && typeof (entry as DocumentAttachment).id === 'string'
      && typeof (entry as DocumentAttachment).name === 'string'
      && typeof (entry as DocumentAttachment).mime === 'string'
      && typeof (entry as DocumentAttachment).size === 'number',
    )
  }
  catch {
    return []
  }
}

export function serializeDocumentAttachments(attachments: DocumentAttachment[]): string {
  return JSON.stringify(attachments.slice(0, 50))
}

export function parseDocumentAttachmentsFromRow(
  metadata: Record<string, unknown> | null,
): DocumentAttachment[] {
  if (!metadata || typeof metadata !== 'object') return []

  const raw = metadata[DOCUMENT_ATTACHMENTS_KEY]
  if (typeof raw === 'string') {
    return parseDocumentAttachments({ [DOCUMENT_ATTACHMENTS_KEY]: raw })
  }
  if (Array.isArray(raw)) {
    return parseDocumentAttachments({
      [DOCUMENT_ATTACHMENTS_KEY]: JSON.stringify(raw),
    })
  }
  return []
}

export function buildDocumentMetadata(
  docType: string,
  attachments: DocumentAttachment[],
  existing?: Record<string, string>,
): Record<string, string> {
  const metadata: Record<string, string> = {
    ...(existing ?? {}),
    docType,
  }

  if (attachments.length > 0) {
    metadata[DOCUMENT_ATTACHMENTS_KEY] = serializeDocumentAttachments(attachments)
  }
  else {
    delete metadata[DOCUMENT_ATTACHMENTS_KEY]
  }

  return metadata
}

export function attachmentFileLabel(mime: string, name: string): string {
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('image/')) return 'Image'
  if (mime.includes('word') || name.endsWith('.docx')) return 'Word'
  if (mime.includes('sheet') || mime.includes('excel') || name.endsWith('.xlsx')) return 'Excel'
  if (mime.startsWith('text/')) return 'Text'
  if (mime.includes('zip') || mime.includes('compressed')) return 'Archive'
  return 'File'
}
