import { ref } from 'vue'
import type { ObjectInfo } from '../types/workflow'

const CACHE_KEY = 'cwd_object_info_cache'

interface CachedObjectInfo {
  data: ObjectInfo
  cachedAt: string
}

function loadCache(): CachedObjectInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CachedObjectInfo) : null
  } catch {
    return null
  }
}

function saveCache(data: ObjectInfo): string {
  const cachedAt = new Date().toISOString()
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt }))
  } catch {
    // localStorage may be full or unavailable
  }
  return cachedAt
}

export function useServerConnection() {
  const initial = loadCache()

  const objectInfo = ref<ObjectInfo | null>(initial?.data ?? null)
  const schemaStatus = ref<'idle' | 'loading' | 'connected' | 'cached' | 'error'>(
    initial ? 'cached' : 'idle',
  )
  const cachedAt = ref<string | null>(initial?.cachedAt ?? null)

  async function connect(url: string): Promise<void> {
    schemaStatus.value = 'loading'
    try {
      const base = url.replace(/\/$/, '')
      const res = await fetch(`${base}/object_info`, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as ObjectInfo
      cachedAt.value = saveCache(data)
      objectInfo.value = data
      schemaStatus.value = 'connected'
    } catch {
      schemaStatus.value = 'error'
    }
  }

  function disconnect(): void {
    const c = loadCache()
    objectInfo.value = c?.data ?? null
    schemaStatus.value = c ? 'cached' : 'idle'
    cachedAt.value = c?.cachedAt ?? null
  }

  return { objectInfo, schemaStatus, cachedAt, connect, disconnect }
}
