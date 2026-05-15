import type { GraphWorkflow } from '../types/workflow'
import { fixGhostLinks, fixLinkTypeMetadata } from './fixes/link'
import { fixStaleMediaRefs } from './fixes/media'

export interface FixResult {
  fixed: string
  changes: number
  mediaFiles: string[]
}

export function fixWorkflow(jsonText: string): FixResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { fixed: jsonText, changes: 0, mediaFiles: [] }
  }

  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj['nodes']) || !Array.isArray(obj['links'])) {
    return { fixed: jsonText, changes: 0, mediaFiles: [] }
  }

  // Deep-clone once — all fix functions receive and mutate this copy
  const workflow = JSON.parse(JSON.stringify(parsed)) as GraphWorkflow
  let changes = 0

  // Order matters: ghost-link removal must precede type-metadata correction
  changes += fixGhostLinks(workflow)
  changes += fixLinkTypeMetadata(workflow)

  const mediaResult = fixStaleMediaRefs(workflow)
  changes += mediaResult.changes

  return {
    fixed: JSON.stringify(workflow, null, 2),
    changes,
    mediaFiles: [...mediaResult.substituted],
  }
}

// Re-export for consumers that need the stale-ref predicate directly
export { isLikelyStaleRef } from './shared/stale-ref'
