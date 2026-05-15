import { ref } from 'vue'
import type { ObjectInfo } from '../types/workflow'

export function useServerConnection() {
  const objectInfo = ref<ObjectInfo | null>(null)
  const schemaStatus = ref<'idle' | 'loading' | 'connected' | 'error'>('idle')

  async function connect(url: string): Promise<void> {
    schemaStatus.value = 'loading'
    try {
      const base = url.replace(/\/$/, '')
      const res = await fetch(`${base}/object_info`, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      objectInfo.value = await res.json()
      schemaStatus.value = 'connected'
    } catch {
      schemaStatus.value = 'error'
      objectInfo.value = null
    }
  }

  function disconnect(): void {
    objectInfo.value = null
    schemaStatus.value = 'idle'
  }

  return { objectInfo, schemaStatus, connect, disconnect }
}
