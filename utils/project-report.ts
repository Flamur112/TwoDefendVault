import {
  assigneeLabels,
  formatProjectTimestamp,
  formatUpdateTimestamp,
  type ProjectViewModel,
} from '~/utils/projects'

function safeFilename(value: string): string {
  return value
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'project'
}

export function buildProjectReportText(project: ProjectViewModel, clientName?: string): string {
  const lines: string[] = []
  const meta = project.record.metadata

  lines.push(`Project report: ${project.record.title}`)
  if (clientName) lines.push(`Client: ${clientName}`)
  lines.push(`Status: ${project.status}`)
  lines.push(`Assigned: ${assigneeLabels(project.assignees)}`)
  if (meta.startDate) lines.push(`Start date: ${meta.startDate}`)
  if (meta.endDate) lines.push(`Target date: ${meta.endDate}`)
  if (project.timeline) lines.push(`Timeline: ${project.timeline.label}`)
  lines.push(`Last updated: ${formatProjectTimestamp(project.record.updatedAt)}`)
  lines.push('')

  if (project.record.notes?.trim()) {
    lines.push('Notes')
    lines.push(project.record.notes.trim())
    lines.push('')
  }

  lines.push(`Updates (${project.updates.length})`)
  lines.push('---')

  if (project.updates.length === 0) {
    lines.push('No updates posted yet.')
  }
  else {
    for (const entry of [...project.updates].reverse()) {
      lines.push(`${entry.userName} · ${formatUpdateTimestamp(entry)}`)
      if (entry.status) lines.push(`Status: ${entry.status}`)
      lines.push(entry.text)
      lines.push('')
    }
  }

  lines.push('---')
  lines.push(`Generated ${formatProjectTimestamp(new Date().toISOString())}`)

  return lines.join('\n')
}

export function downloadProjectReport(project: ProjectViewModel, clientName?: string): void {
  const text = buildProjectReportText(project, clientName)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const clientPart = clientName ? `${safeFilename(clientName)}-` : ''
  anchor.href = url
  anchor.download = `${clientPart}${safeFilename(project.record.title)}-report.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}
