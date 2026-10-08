interface FeedCacheEntry {
  rawLeads: any[]
  total: number
  cachedAt: number
}

const feedCache = new Map<string, FeedCacheEntry>()
const FEED_CACHE_TTL = 5_000 // 5 seconds (ensures newly scraped leads appear in real time)
const MAX_FEED_CACHE_SIZE = 50

export function getCachedFeed(key: string): FeedCacheEntry | null {
  const entry = feedCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > FEED_CACHE_TTL) {
    feedCache.delete(key)
    return null
  }
  return entry
}

export function setCachedFeed(key: string, data: { rawLeads: any[]; total: number }) {
  if (feedCache.size >= MAX_FEED_CACHE_SIZE) {
    const oldestKey = feedCache.keys().next().value
    if (oldestKey) feedCache.delete(oldestKey)
  }
  feedCache.set(key, { ...data, cachedAt: Date.now() })
}

export function clearFeedCache() {
  feedCache.clear()
}

// Reveal counts cache (sorted leadIds key -> count map) with 15s TTL
interface RevealCountsCacheEntry {
  counts: Map<string, number>
  cachedAt: number
}

const revealCountsCache = new Map<string, RevealCountsCacheEntry>()
const REVEAL_CACHE_TTL = 15_000 // 15 seconds

export function getCachedRevealCounts(cacheKey: string): Map<string, number> | null {
  const entry = revealCountsCache.get(cacheKey)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > REVEAL_CACHE_TTL) {
    revealCountsCache.delete(cacheKey)
    return null
  }
  return entry.counts
}

export function setCachedRevealCounts(cacheKey: string, counts: Map<string, number>) {
  if (revealCountsCache.size >= 100) {
    const oldestKey = revealCountsCache.keys().next().value
    if (oldestKey) revealCountsCache.delete(oldestKey)
  }
  revealCountsCache.set(cacheKey, { counts, cachedAt: Date.now() })
}

export function invalidateLeadRevealCount(leadId: string) {
  // Clear feed caches to ensure fresh card counts
  feedCache.clear()

  // Invalidate any reveal count caches containing this lead
  for (const [key, entry] of revealCountsCache.entries()) {
    if (key.includes(leadId)) {
      revealCountsCache.delete(key)
    }
  }
}

export function clearRevealCountsCache() {
  revealCountsCache.clear()
}

