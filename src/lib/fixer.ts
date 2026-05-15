import type { GraphWorkflow, ObjectInfo } from '../types/workflow'
import { fixGhostLinks, fixLinkTypeMetadata } from './fixes/link'
import { fixBypassedNodes } from './fixes/node-state'
import { fixStaleMediaRefs } from './fixes/media'
import { fixTypeMismatch } from './fixes/type-conversion'
import { fixDisconnectedInputs } from './fixes/connect-input'
import { nodeTypeMap } from './shared/node-type-map'

export interface BreakdownItem {
  label: string
  count: number
}

export interface FixResult {
  fixed: string
  changes: number
  mediaFiles: string[]
  partial: boolean
  breakdown: BreakdownItem[]
}

export function fixWorkflow(jsonText: string, objectInfo?: ObjectInfo): FixResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { fixed: jsonText, changes: 0, mediaFiles: [], partial: false, breakdown: [] }
  }

  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj['nodes']) || !Array.isArray(obj['links'])) {
    return { fixed: jsonText, changes: 0, mediaFiles: [], partial: false, breakdown: [] }
  }

  const workflow = JSON.parse(JSON.stringify(parsed)) as GraphWorkflow
  let partial = false

  // 1. Ghost link slots + ghost node remapping (must run before type metadata)
  const ghostResult = fixGhostLinks(workflow)

  // 2. Sync link[5] type labels (must run after ghost-link removal)
  const typeMetaChanges = fixLinkTypeMetadata(workflow)

  // 3. Enable bypassed nodes (satisfy missing inputs, then set mode=0)
  //    Must run before type-mismatch and disconnected-input fixes so that
  //    newly-enabled nodes can handle their own type conversions.
  const bypassResult = fixBypassedNodes(workflow, nodeTypeMap)
  if (bypassResult.partial) partial = true

  // 4. Insert conversion nodes for type mismatches
  const convResult = fixTypeMismatch(workflow, nodeTypeMap)
  if (convResult.partial) partial = true

  // 5. Connect or insert nodes for unconnected required inputs
  const connResult = fixDisconnectedInputs(workflow, nodeTypeMap, objectInfo)
  if (connResult.partial) partial = true

  // 6. Replace stale media file references
  const mediaResult = fixStaleMediaRefs(workflow)

  const breakdown: BreakdownItem[] = [
    { label: 'Ghost link slot refs removed', count: ghostResult.slotChanges },
    { label: 'Ghost node refs remapped or removed', count: ghostResult.nodeRefChanges },
    { label: 'Link type labels corrected', count: typeMetaChanges },
    { label: 'Bypassed nodes enabled', count: bypassResult.changes },
    { label: 'Type conversion nodes inserted', count: convResult.changes },
    { label: 'Disconnected inputs wired', count: connResult.changes },
    { label: 'Stale media refs replaced', count: mediaResult.changes },
  ].filter((item) => item.count > 0)

  const changes =
    ghostResult.slotChanges +
    ghostResult.nodeRefChanges +
    typeMetaChanges +
    bypassResult.changes +
    convResult.changes +
    connResult.changes +
    mediaResult.changes

  return {
    fixed: JSON.stringify(workflow, null, 2),
    changes,
    mediaFiles: [...mediaResult.substituted],
    partial,
    breakdown,
  }
}

export { isLikelyStaleRef } from './shared/stale-ref'
