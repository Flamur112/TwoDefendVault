import {
  getLoginDelight,
  loginDelightSessionKey,
  type LoginDelightType,
} from '~/utils/login-delight'

const DELIGHT_DURATION_MS = 2800

export function useLoginDelight() {
  const { user } = useSession()
  const delightType = ref<LoginDelightType | null>(null)
  let clearTimer: ReturnType<typeof setTimeout> | null = null

  function clearDelight() {
    if (clearTimer) {
      clearTimeout(clearTimer)
      clearTimer = null
    }
    delightType.value = null
  }

  function triggerLoginDelight() {
    if (!import.meta.client) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const userSeed = user.value?.id ?? user.value?.email
    if (!userSeed) return

    const sessionKey = loginDelightSessionKey(userSeed)
    if (sessionStorage.getItem(sessionKey)) return

    const delight = getLoginDelight(userSeed)
    if (!delight) return

    sessionStorage.setItem(sessionKey, delight)
    delightType.value = delight

    clearTimer = setTimeout(clearDelight, DELIGHT_DURATION_MS)
  }

  onBeforeUnmount(clearDelight)

  return {
    delightType: readonly(delightType),
    triggerLoginDelight,
  }
}
