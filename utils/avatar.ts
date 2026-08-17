const AVATAR_COLORS = [
  '#6b8cff',
  '#2dd4bf',
  '#fbbf24',
  '#a78bfa',
  '#fb7185',
  '#38bdf8',
  '#4ade80',
  '#f472b6',
]

export function avatarColorForName(name: string): string {
  let hash = 0
  for (const char of name) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

export function initialsForName(name: string): string {
  return name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()
}
