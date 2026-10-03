interface FeedCacheEntry {
  rawLeads: any[]
  total: number
  cachedAt: number
}

const feedCache = new Map<string, FeedCacheEntry>()
const FEED_CACHE_TTL = 30_000 // 30 seconds
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

