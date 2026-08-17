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
  type?: 'text' | 'url' | 'date' | 'number'
}

export interface SectionConfig {
  label: string
  description: string
  addLabel: string
  fields: SectionField[]
}

export const CLIENT_SECTIONS: Record<ClientSection, SectionConfig> = {
  documents: {
    label: 'Documents',
    description: 'Contracts, SOPs, runbooks, and reference documents.',
    addLabel: 'Add document',
    fields: [
      { key: 'docType', label: 'Type', placeholder: 'Contract, SOP, runbook…' },
      { key: 'url', label: 'Link', type: 'url', placeholder: 'https://…' },
    ],
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
    description: 'Open and completed projects for this client.',
    addLabel: 'Add project',
    fields: [
      { key: 'status', label: 'Status', placeholder: 'Open, on hold, completed…' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End / target date', type: 'date' },
    ],
  },
}

export const CLIENT_SECTION_SLUGS = Object.keys(CLIENT_SECTIONS) as ClientSection[]

export function isClientSection(value: string): value is ClientSection {
  return CLIENT_SECTION_SLUGS.includes(value as ClientSection)
}
