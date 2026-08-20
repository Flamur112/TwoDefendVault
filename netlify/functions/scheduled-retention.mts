import type { Config } from '@netlify/functions'

const handler = async () => {
  const appUrl = (process.env.APP_URL || process.env.URL || '').replace(/\/$/, '')
  const secret = process.env.CRON_SECRET

  if (!appUrl || !secret) {
    console.error('[scheduled-retention] APP_URL and CRON_SECRET must be set')
    return { statusCode: 503, body: 'Not configured' }
  }

  try {
    const response = await fetch(`${appUrl}/api/internal/retention-purge`, {
      method: 'POST',
      headers: {
        'x-cron-secret': secret,
        'content-type': 'application/json',
      },
    })

    const body = await response.text()
    if (!response.ok) {
      console.error('[scheduled-retention] purge failed:', response.status, body)
      return { statusCode: response.status, body }
    }

    console.log('[scheduled-retention] purge ok:', body)
    return { statusCode: 200, body }
  }
  catch (err) {
    console.error('[scheduled-retention] request failed:', err)
    return { statusCode: 500, body: 'Request failed' }
  }
}

export default handler

export const config: Config = {
  schedule: '0 4 * * *',
}
