const ROUTE_TITLES: Array<{ match: RegExp | string, title: string }> = [
  { match: '/dashboard', title: 'Dashboard' },
  { match: '/clients', title: 'Clients' },
  { match: /^\/clients\/[^/]+\/credentials/, title: 'Credentials' },
  { match: /^\/clients\/[^/]+\/documents/, title: 'Documents' },
  { match: /^\/clients\/[^/]+\/projects/, title: 'Projects' },
  { match: /^\/clients\/[^/]+\/details/, title: 'Client details' },
  { match: /^\/clients\/[^/]+$/, title: 'Client' },
  { match: '/assets', title: 'Assets' },
  { match: '/projects', title: 'Projects' },
  { match: '/admin/users', title: 'Users' },
  { match: '/admin/sign-ins', title: 'Sign-in activity' },
  { match: '/admin/audit', title: 'Audit log' },
  { match: '/admin', title: 'Admin' },
  { match: '/settings', title: 'Profile' },
  { match: '/login', title: 'Sign in' },
  { match: /^\/vault\//, title: 'Vault' },
]

export function pageTitleForPath(path: string): string {
  for (const entry of ROUTE_TITLES) {
    if (typeof entry.match === 'string') {
      if (path === entry.match || path === `${entry.match}/`) return entry.title
    }
    else if (entry.match.test(path)) {
      return entry.title
    }
  }
  return 'TwoDefend Vault'
}
