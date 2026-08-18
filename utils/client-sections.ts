export type ClientSection
  = | 'documents'
    | 'assets'
    | 'files'
    | 'locations'
    | 'licenses'
    | 'projects'

export interface SectionField {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'url' | 'date' | 'number' | 'select' | 'user'
  options?: string[]
}

export interface SectionConfig {
  label: string
  description: string
  helpText?: string
  addLabel: string
  titleLabel?: string
  titlePlaceholder?: string
  notesPlaceholder?: string
  fields: SectionField[]
}

export const CLIENT_SECTIONS: Record<ClientSection, SectionConfig> = {
  documents: {
    label: 'Documents',
    description: 'How-to guides and info docs written in Markdown for this client.',
    addLabel: 'New document',
    fields: [],
  },
  assets: {
    label: 'Assets',
    description: 'Hardware, servers, workstations, and other client assets.',
    addLabel: 'Add asset',
    fields: [
      { key: 'assetType', label: 'Type', placeholder: 'Server, workstation, firewall…' },
      { key: 'serial', label: 'Serial number' },
      { key: 'model', label: 'Model' },
      { key: 'location', label: 'Location' },
    ],
  },
  files: {
    label: 'Files',
    description: 'File references and shared storage links.',
    addLabel: 'Add file',
    fields: [
      { key: 'fileType', label: 'Type', placeholder: 'Backup, image, config…' },
      { key: 'url', label: 'Link / path', type: 'url', placeholder: 'https://… or \\\\share\\path' },
    ],
  },
  locations: {
    label: 'Locations',
    description: 'Offices, sites, and physical locations for this client.',
    addLabel: 'Add location',
    fields: [
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State / region' },
      { key: 'country', label: 'Country' },
      { key: 'phone', label: 'Phone' },
    ],
  },
  licenses: {
    label: 'Licenses',
    description: 'Software licenses and subscriptions. Store secrets in Credentials.',
    addLabel: 'Add license',
    fields: [
      { key: 'vendor', label: 'Vendor', placeholder: 'Microsoft, Adobe…' },
      { key: 'seats', label: 'Seats', type: 'number' },
      { key: 'expiresAt', label: 'Expiry date', type: 'date' },
      { key: 'reference', label: 'Reference / SKU' },
    ],
  },
  projects: {
    label: 'Projects',
    description: 'Track status, team assignments, and progress updates for client work.',
    addLabel: 'Add project',
    fields: [],
  },
}

export const CLIENT_SECTION_SLUGS = Object.keys(CLIENT_SECTIONS) as ClientSection[]

export function isClientSection(value: string): value is ClientSection {
  return CLIENT_SECTION_SLUGS.includes(value as ClientSection)
}

/** Stored name field for a user picker (e.g. assigneeUserId → assigneeName). */
export function sectionFieldDisplayKey(field: SectionField): string | null {
  if (field.type !== 'user') return null
  if (field.key.endsWith('UserId')) return field.key.replace(/UserId$/, 'Name')
  return `${field.key}Name`
}
