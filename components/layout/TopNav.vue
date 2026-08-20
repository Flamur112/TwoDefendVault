<template>
  <header class="topnav" :class="{ 'topnav--collapsed': collapsed }">
    <div class="left">
      <button type="button" class="icon-btn" aria-label="Toggle sidebar" @click="toggle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
    </div>

    <div v-if="showTopSearch" ref="searchRef" class="center">
      <div class="search-wrap">
        <input
          ref="searchInput"
          v-model="searchText"
          type="search"
          class="search"
          placeholder="Search clients, credentials, assets..."
          autocomplete="off"
          aria-label="Search"
          @focus="onSearchFocus"
          @keydown.escape="closeResults"
        >
        <kbd class="search-kbd" aria-hidden="true">{{ shortcutLabel }}</kbd>
      </div>
      <div v-if="showGlobalResults" class="search-results">
        <p v-if="globalLoading" class="search-status">Searching...</p>
        <p v-else-if="globalError" class="search-status error">{{ globalError }}</p>
        <p v-else-if="totalResults === 0" class="search-status">No results</p>
        <template v-else>
          <div v-if="globalResults.clients.length" class="search-group">
            <div class="search-group-label">Clients</div>
            <NuxtLink
              v-for="client in globalResults.clients"
              :key="client.id"
              :to="client.href"
              class="search-result"
              @click="closeResults"
            >
              <span class="search-result-title">{{ client.name }}</span>
              <span v-if="client.industry" class="search-result-meta">{{ client.industry }}</span>
            </NuxtLink>
          </div>

          <div v-if="globalResults.credentials.length" class="search-group">
            <div class="search-group-label">Credentials</div>
            <NuxtLink
              v-for="credential in globalResults.credentials"
              :key="credential.id"
              :to="credential.href"
              class="search-result"
              @click="closeResults"
            >
              <span class="search-result-title">{{ credential.name }}</span>
              <span class="search-result-meta">
                {{ credential.clientName || 'Unassigned client' }} · {{ credential.vaultName }} · {{ credential.itemTypeLabel }}
              </span>
              <span v-if="credential.url" class="search-result-meta">{{ credential.url }}</span>
            </NuxtLink>
          </div>

          <div v-if="globalResults.records.length" class="search-group">
            <div class="search-group-label">Records</div>
            <NuxtLink
              v-for="record in globalResults.records"
              :key="record.id"
              :to="record.href"
              class="search-result"
              @click="closeResults"
            >
              <span class="search-result-title">{{ record.title }}</span>
              <span class="search-result-meta">
                {{ record.clientName }} · {{ record.sectionLabel }}
              </span>
            </NuxtLink>
          </div>
        </template>
      </div>
    </div>

    <div class="right">
      <div ref="menuRef" class="user-menu">
        <button type="button" class="user-btn" aria-expanded="open" @click.stop="open = !open">
          <UiUserAvatar
            :name="user?.displayName || user?.email || 'Account'"
            :avatar-url="user?.avatarUrl"
            :size="32"
          />
          <span class="name">{{ user?.displayName || user?.email || 'Account' }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div v-if="open" class="dropdown">
          <div class="dropdown-header">{{ user?.email }}</div>
          <NuxtLink to="/settings" class="dropdown-item" @click="open = false">Profile</NuxtLink>
          <button type="button" class="dropdown-item" @click="onSignOut">Sign out</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { GlobalSearchResults } from '~/types/search'

const route = useRoute()
const { user, logout } = useSession()
const { collapsed, toggle } = useSidebar()
const appSearch = useAppSearch()
const apiFetch = useApiFetch()

const searchText = computed({
  get: () => appSearch.query.value,
  set: (value: string) => {
    appSearch.query.value = value
  },
})

const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const searchFocused = ref(false)
const globalResults = ref<GlobalSearchResults>({ clients: [], credentials: [], records: [] })
const globalLoading = ref(false)
const globalError = ref('')

const showTopSearch = computed(() => !appSearch.hasDedicatedPageSearch(route.path))

const totalResults = computed(() =>
  globalResults.value.clients.length
  + globalResults.value.credentials.length
  + globalResults.value.records.length,
)

const showGlobalResults = computed(() =>
  showTopSearch.value
  && searchFocused.value
  && appSearch.query.value.trim().length > 0,
)

const shortcutLabel = computed(() =>
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl+K',
)

function focusGlobalSearch() {
  if (!showTopSearch.value) return
  searchInput.value?.focus()
  searchInput.value?.select()
  searchFocused.value = true
  if (appSearch.query.value.trim()) {
    runGlobalSearch()
  }
}

let globalDebounce: ReturnType<typeof setTimeout> | null = null

async function runGlobalSearch() {
  const q = appSearch.query.value.trim()
  if (!q || q.length < 2 || !showTopSearch.value) {
    globalResults.value = { clients: [], credentials: [], records: [] }
    globalError.value = ''
    return
  }

  globalLoading.value = true
  globalError.value = ''
  try {
    globalResults.value = await apiFetch<GlobalSearchResults>('/api/search', { query: { q } })
  }
  catch {
    globalError.value = 'Search failed'
    globalResults.value = { clients: [], credentials: [], records: [] }
  }
  finally {
    globalLoading.value = false
  }
}

watch(appSearch.query, () => {
  if (!showTopSearch.value) return
  if (globalDebounce) clearTimeout(globalDebounce)
  globalDebounce = setTimeout(runGlobalSearch, 400)
})

watch(() => route.path, (path, previousPath) => {
  closeResults()
  const nextContext = appSearch.getSearchContext(path)
  const prevContext = previousPath ? appSearch.getSearchContext(previousPath) : null
  if (nextContext !== prevContext) {
    appSearch.clearSearch()
  }
})

function onSearchFocus() {
  searchFocused.value = true
  if (showTopSearch.value && appSearch.query.value.trim()) {
    runGlobalSearch()
  }
}

function closeResults() {
  searchFocused.value = false
}

async function onSignOut() {
  open.value = false
  await logout()
}

onMounted(() => {
  document.addEventListener('click', (e) => {
    if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
      open.value = false
    }
    if (searchRef.value && !searchRef.value.contains(e.target as Node)) {
      closeResults()
    }
  })

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      focusGlobalSearch()
    }
  })
})
</script>

<style scoped>
.topnav {
  position: fixed;
  top: 0;
  right: 0;
  left: var(--sidebar-w);
  height: var(--navbar-h);
  background: var(--sidebar);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 1rem;
  gap: 1rem;
  z-index: 100;
  transition: left 0.2s ease;
}

.topnav--collapsed {
  left: var(--sidebar-collapsed);
}

.left, .right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 6px;
}

.icon-btn:hover {
  color: var(--text);
  background: var(--card);
}

.center {
  flex: 1;
  min-width: 0;
  max-width: none;
  margin: 0 0.5rem;
  position: relative;
}

.search-wrap {
  position: relative;
}

.search {
  width: 100%;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.55rem 3.25rem 0.55rem 1rem;
  min-height: 40px;
  color: var(--text);
  font-size: 0.9375rem;
}

.search-kbd {
  position: absolute;
  right: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.6875rem;
  line-height: 1;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  color: var(--text-muted);
  background: var(--bg-subtle);
  font-family: inherit;
}

.search-results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.35rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 130;
  max-height: 360px;
  overflow-y: auto;
}

.search-group + .search-group {
  margin-top: 0.35rem;
  padding-top: 0.35rem;
  border-top: 1px solid var(--border);
}

.search-group-label {
  padding: 0.35rem 0.75rem 0.2rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--accent-violet);
}

.search-group:nth-child(2) .search-group-label { color: var(--accent-teal); }
.search-group:nth-child(3) .search-group-label { color: var(--accent-sky); }

.search-result {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.55rem 0.75rem;
  border-radius: 6px;
  text-decoration: none;
  color: var(--text);
}

.search-result:hover {
  background: var(--bg);
}

.search-result-title {
  font-weight: 700;
  font-size: 0.875rem;
  background: linear-gradient(135deg, #ffffff 0%, #b4c4ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.search-result-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.search-status {
  margin: 0;
  padding: 0.55rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.search-status.error {
  color: var(--danger);
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
}
.user-btn:hover { background: var(--card); }

.name {
  font-size: 0.875rem;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu { position: relative; }

.dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  min-width: 180px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.35rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  z-index: 120;
}

.dropdown-header {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.25rem;
}

.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  color: var(--text);
  cursor: pointer;
  border-radius: 4px;
  text-decoration: none;
  font-size: 0.875rem;
}
.dropdown-item:hover { background: var(--bg); }
</style>
