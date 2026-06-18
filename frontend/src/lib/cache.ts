import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 2,
})

export function getCached(key: string): any | undefined {
  return cache.get(key)
}

export function setCache(key: string, value: any, ttlMs?: number): void {
  cache.set(key, value, { ttl: ttlMs })
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key)
    }
  }
}

export function cacheKey(...parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(':')
}
