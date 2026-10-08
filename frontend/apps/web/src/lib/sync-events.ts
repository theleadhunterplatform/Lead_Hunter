/**
 * Cross-tab, cross-window, and component-level lead synchronization utility.
 * Automatically broadcasts and listens for scraping events and lead updates.
 */

export interface LeadSyncEventDetail {
  source?: string
  keyword?: string
  timestamp?: number
}

const BROADCAST_CHANNEL_NAME = 'lead-hunter-sync'
const LOCAL_STORAGE_KEY = 'lead-hunter-sync-timestamp'

export function notifyLeadsUpdated(detail?: LeadSyncEventDetail) {
  if (typeof window === 'undefined') return

  const payload: LeadSyncEventDetail = {
    timestamp: Date.now(),
    ...detail,
  }

  // 1. In-window custom event
  try {
    window.dispatchEvent(new CustomEvent('refresh-leads', { detail: payload }))
  } catch {
    window.dispatchEvent(new Event('refresh-leads'))
  }

  // 2. BroadcastChannel for cross-tab communication
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      channel.postMessage({ type: 'refresh-leads', ...payload })
      channel.close()
    }
  } catch {
    // Ignore unsupported environments
  }

  // 3. LocalStorage event as universal cross-tab fallback
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage quota or access errors
  }
}

export function subscribeToLeadsUpdated(callback: (detail?: LeadSyncEventDetail) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<LeadSyncEventDetail>
    callback(custom.detail)
  }

  window.addEventListener('refresh-leads', handleCustomEvent)

  let channel: BroadcastChannel | null = null
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      channel.onmessage = (event) => {
        if (event.data?.type === 'refresh-leads') {
          callback(event.data)
        }
      }
    }
  } catch {
    // Ignore
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue)
        callback(parsed)
      } catch {
        callback()
      }
    }
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener('refresh-leads', handleCustomEvent)
    window.removeEventListener('storage', handleStorage)
    if (channel) {
      try {
        channel.close()
      } catch {
        // Ignore
      }
    }
  }
}
