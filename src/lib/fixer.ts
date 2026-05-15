import type { GraphWorkflow, ObjectInfo } from '../types/workflow'
import { fixGhostLinks, fixLinkTypeMetadata } from './fixes/link'
import { fixStaleMediaRefs } from './fixes/media'
import { fixTypeMismatch } from './fixes/type-conversion'
import { fixDisconnectedInputs } from './fixes/connect-input'
import { nodeTypeMap } from './shared/node-type-map'

export interface FixResult {
  fixed: string
  changes: number
  mediaFiles: string[]
  partial: boolean
}

export function fixWorkflow(jsonText: string, objectInfo?: ObjectInfo): FixResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { fixed: jsonText, changes: 0, mediaFiles: [], partial: false }
  }

  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj['nodes']) || !Array.isArray(obj['links'])) {
    return { fixed: jsonText, changes: 0, mediaFiles: [], partial: false }
  }

  const workflow = JSON.parse(JSON.stringify(parsed)) as GraphWorkflow
  let changes = 0
  let partial  = false

  // 1. Ghost link slots + ghost node remapping (must run before type metadata)
  changes += fixGhostLinks(workflow)

  // 2. Sync link[5] type labels (must run after ghost-link removal)
  changes += fixLinkTypeMetadata(workflow)

  // 3. Insert conversion nodes for type mismatches
  const convResult = fixTypeMismatch(workflow, nodeTypeMap)
  changes += convResult.changes
  if (convResult.partial) partial = true

  // 4. Connect or insert nodes for unconnected required inputs
  const connResult = fixDisconnectedInputs(workflow, nodeTypeMap, objectInfo)
  changes += connResult.changes
  if (connResult.partial) partial = true

  // 5. Replace stale media file references
  const mediaResult = fixStaleMediaRefs(workflow)
  changes += mediaResult.changes

  return {
    fixed: JSON.stringify(workflow, null, 2),
    changes,
    mediaFiles: [...mediaResult.substituted],
    partial,
  }
}

export { isLikelyStaleRef } from './shared/stale-ref'
