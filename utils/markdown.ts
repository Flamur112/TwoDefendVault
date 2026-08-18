import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const UNSAFE_TAG_PATTERN = /<\/?(?:script|iframe|object|embed|form|input|button|textarea|select|link|meta|base|style)[^>]*>/gi
const EVENT_HANDLER_PATTERN = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi

export function renderMarkdown(source: string): string {
  if (!source.trim()) return ''

  const html = marked.parse(source, { async: false }) as string
  return html
    .replace(UNSAFE_TAG_PATTERN, '')
    .replace(EVENT_HANDLER_PATTERN, '')
}
