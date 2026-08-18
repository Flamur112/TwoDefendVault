export const DOCUMENT_TYPES = [
  'How-to guide',
  'Info guide',
  'SOP / Runbook',
  'Policy',
  'Reference',
  'Other',
] as const

export type DocumentType = typeof DOCUMENT_TYPES[number]

export function getDocumentType(metadata: Record<string, string>): string {
  return metadata.docType || 'Info guide'
}

export function documentExcerpt(markdown: string | null | undefined, max = 140): string {
  if (!markdown?.trim()) return 'No content yet'

  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~>#|[\]()!-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plain) return 'No content yet'
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}
