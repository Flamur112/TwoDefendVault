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

export interface SectionGuide {
  /** One-line summary shown under the section title */
  summary: string
  /** What belongs in this section */
  useFor: string[]
  /** Common mistakes — what to store elsewhere */
  notFor?: string[]
  /** Optional workflow tips */
  tips?: string[]
}

export interface SectionConfig {
  label: string
  description: string
  guide: SectionGuide
  addLabel: string
  titleLabel?: string
  titlePlaceholder?: string
  notesPlaceholder?: string
  fields: SectionField[]
}

export interface ClientTabLink {
  slug: string
  label: string
  summary: string
}

export const CLIENT_WORKSPACE_TABS: ClientTabLink[] = [
  {
    slug: 'credentials',
    label: 'Credentials',
    summary: 'Encrypted passwords, API keys, and vault file folders',
  },
  {
    slug: 'documents',
    label: 'Documents',
    summary: 'Markdown how-to guides with optional file attachments',
  },
  {
    slug: 'files',
    label: 'Files',
    summary: 'General client file storage — backups, exports, configs',
  },
  {
    slug: 'assets',
    label: 'Assets',
    summary: 'Hardware inventory with photos, warranties, and exports',
  },
  {
    slug: 'locations',
    label: 'Locations',
    summary: 'Offices, sites, and contact details by address',
  },
  {
    slug: 'licenses',
    label: 'Licenses',
    summary: 'Software subscriptions and renewal tracking',
  },
  {
    slug: 'projects',
    label: 'Projects',
    summary: 'Active work, assignees, status, and progress updates',
  },
  {
    slug: 'details',
    label: 'Details',
    summary: 'Client profile, logo, and account metadata',
  },
]

export const CREDENTIALS_GUIDE: SectionGuide = {
  summary: 'Store encrypted login secrets in vaults. Admins see every vault; members only see vaults shared with them.',
  useFor: [
    'Website, admin, and service logins',
    'API keys and tokens (encrypted at rest)',
    'File folders tied to a credential vault (configs, screenshots)',
  ],
  notFor: [
    'Long-form documentation — use Documents',
    'General client backups — use Files',
    'Hardware serial numbers — use Assets',
  ],
  tips: [
    'Group credentials by vault (e.g. “Microsoft 365”, “Firewall”).',
    'Expand “Files & folders” under a vault to upload related files.',
    'Admins: use Manage access on each vault to share it with specific team members.',
  ],
}

export const CLIENT_SECTIONS: Record<ClientSection, SectionConfig> = {
  documents: {
    label: 'Documents',
    description: 'How-to guides and reference docs written in Markdown.',
    guide: {
      summary: 'Write searchable guides for this client. Attach PDFs, images, or folders when a doc needs supporting files.',
      useFor: [
        'VPN setup steps, escalation procedures, onboarding checklists',
        'Runbooks and internal how-to content',
        'Supporting files attached to a specific guide',
      ],
      notFor: [
        'Passwords or secrets — use Credentials',
        'Loose files not tied to a guide — use Files',
      ],
      tips: [
        'Pick a document type so the team can scan the list quickly.',
        'Use attachments for PDFs, exports, or whole folders referenced in the guide.',
        'Admins can restrict visibility to members-only or admins-only when creating or editing.',
      ],
    },
    addLabel: 'New document',
    fields: [],
  },
  assets: {
    label: 'Assets',
    description: 'Hardware and equipment tracked per client.',
    guide: {
      summary: 'Record servers, workstations, firewalls, and other gear. Attach photos, warranty PDFs, or config exports to each asset.',
      useFor: [
        'Servers, workstations, laptops, firewalls, switches',
        'Serial numbers, models, and physical location',
        'Warranty PDFs, photos, or config files for a specific device',
      ],
      notFor: [
        'Software license renewals — use Licenses',
        'Login credentials — use Credentials',
      ],
      tips: [
        'Use the asset title for a recognizable name (e.g. “DC-01” or “Reception PC”).',
        'Fill in type, serial, and location so assets are easy to search.',
        'Admins can mark sensitive assets as admins-only or members-only.',
      ],
    },
    addLabel: 'Add asset',
    titleLabel: 'Asset name',
    titlePlaceholder: 'e.g. DC-01, Reception firewall',
    notesPlaceholder: 'Specs, purchase date, support contract notes…',
    fields: [
      { key: 'assetType', label: 'Type', placeholder: 'Server, workstation, firewall…' },
      { key: 'serial', label: 'Serial number' },
      { key: 'model', label: 'Model' },
      { key: 'location', label: 'Location' },
    ],
  },
  files: {
    label: 'Files',
    description: 'Central file library for this client.',
    guide: {
      summary: 'Upload backups, configs, images, and exports in one place. Files save automatically — no separate “save” step.',
      useFor: [
        'Backup archives, network diagrams, and config exports',
        'Shared files that are not tied to one document or asset',
        'Whole folders uploaded at once (structure preserved)',
      ],
      notFor: [
        'Passwords — use Credentials',
        'Written procedures — use Documents',
      ],
      tips: [
        'Use “Upload folder” to keep directory structure intact.',
        'Downloads work per file, per folder, or as a full zip.',
        'Admins can restrict the entire file library to members-only or admins-only.',
      ],
    },
    addLabel: 'Upload files',
    fields: [],
  },
  locations: {
    label: 'Locations',
    description: 'Physical sites and offices for this client.',
    guide: {
      summary: 'Track where this client operates — HQ, branches, and site contacts.',
      useFor: [
        'Office and branch addresses',
        'Site phone numbers and regional contacts',
      ],
      tips: [
        'Use the title for a short site name (e.g. “Skopje HQ”).',
      ],
    },
    addLabel: 'Add location',
    titleLabel: 'Site name',
    titlePlaceholder: 'e.g. Skopje HQ, Warehouse',
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
    description: 'Software subscriptions and renewal dates.',
    guide: {
      summary: 'Track vendors, seat counts, and expiry dates. Store license keys and portal logins in Credentials.',
      useFor: [
        'Microsoft, Adobe, antivirus, and SaaS subscriptions',
        'Seat counts and renewal / expiry dates',
        'SKU or contract reference numbers',
      ],
      notFor: [
        'Actual license keys or portal passwords — use Credentials',
      ],
      tips: [
        'Set expiry dates so renewals show up when searching and reporting.',
      ],
    },
    addLabel: 'Add license',
    titleLabel: 'Product or license name',
    titlePlaceholder: 'e.g. Microsoft 365 Business Premium',
    fields: [
      { key: 'vendor', label: 'Vendor', placeholder: 'Microsoft, Adobe…' },
      { key: 'seats', label: 'Seats', type: 'number' },
      { key: 'expiresAt', label: 'Expiry date', type: 'date' },
      { key: 'reference', label: 'Reference / SKU' },
    ],
  },
  projects: {
    label: 'Projects',
    description: 'Client work with status, assignees, and updates.',
    guide: {
      summary: 'Track engagements from planning through delivery. Post updates to keep the team aligned.',
      useFor: [
        'Onboarding, migrations, audits, and ongoing engagements',
        'Assignees, status, and dated progress updates',
      ],
      notFor: [
        'Static documentation — use Documents',
      ],
      tips: [
        'Post updates when status changes so activity stays visible on Overview.',
      ],
    },
    addLabel: 'Add project',
    titleLabel: 'Project name',
    titlePlaceholder: 'e.g. M365 migration, Q1 security audit',
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

export function clientTabPath(clientId: string, slug: string): string {
  if (slug === 'overview') return `/clients/${clientId}`
  return `/clients/${clientId}/${slug}`
}
