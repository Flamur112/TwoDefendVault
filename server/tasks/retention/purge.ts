export default defineTask({
  meta: {
    name: 'retention:purge',
    description: 'Delete activity, audit, and session rows past retention windows',
  },
  async run() {
    const { runRetentionPurge } = await import('../../utils/retention-purge')
    await runRetentionPurge()
    return { result: 'ok' }
  },
})
