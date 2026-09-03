import {
  DOCUMENT_ATTACHMENTS_KEY,
  parseDocumentAttachments,
  serializeDocumentAttachments,
  type DocumentAttachment,
} from '~/utils/document-attachments'

export const CLIENT_FILE_LIBRARY_FLAG = 'isLibrary'
export const CLIENT_FILE_LIBRARY_TITLE = 'File library'
export const CLIENT_FILES_MAX = 500

export function isFileLibraryRecord(metadata: Record<string, string>): boolean {
  return metadata[CLIENT_FILE_LIBRARY_FLAG] === 'true'
}

export function parseFileLibraryAttachments(metadata: Record<string, string>): DocumentAttachment[] {
  return parseDocumentAttachments(metadata)
}

export function buildFileLibraryMetadata(attachments: DocumentAttachment[]): Record<string, string> {
  const metadata: Record<string, string> = {
    [CLIENT_FILE_LIBRARY_FLAG]: 'true',
  }

  if (attachments.length > 0) {
    metadata[DOCUMENT_ATTACHMENTS_KEY] = serializeDocumentAttachments(
      attachments.slice(0, CLIENT_FILES_MAX),
    )
  }

  return metadata
}
