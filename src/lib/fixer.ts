import type { GraphWorkflow, ObjectInfo, FixType } from '../types/workflow'
import { fixGhostLinks, fixLinkTypeMetadata } from './fixes/link'
import { fixBypassedNodes } from './fixes/node-state'
import { fixStaleMediaRefs } from './fixes/media'
import { fixNullWidgetValues } from './fixes/schema'
import { fixNullWidgetValuesOffline } from './fixes/null-widget-values'
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

  // 1. Replace null widget values — must run first so structural fixes see correct
  //    widget state. Online path uses objectInfo defaults; offline path uses static schema.
  const nullWidgetChanges = objectInfo
    ? fixNullWidgetValues(workflow, objectInfo)
    : fixNullWidgetValuesOffline(workflow)

  // 2. Ghost link slots + ghost node remapping (must run before type metadata)
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
    { label: 'Null widget values replaced', count: nullWidgetChanges },
    { label: 'Ghost link slot refs removed', count: ghostResult.slotChanges },
    { label: 'Ghost node refs remapped or removed', count: ghostResult.nodeRefChanges },
    { label: 'Link type labels corrected', count: typeMetaChanges },
    { label: 'Bypassed nodes enabled', count: bypassResult.changes },
    { label: 'Type conversion nodes inserted', count: convResult.changes },
    { label: 'Disconnected inputs wired', count: connResult.changes },
    { label: 'Stale media refs replaced', count: mediaResult.changes },
  ].filter((item) => item.count > 0)

  const changes =
    nullWidgetChanges +
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

// ---------------------------------------------------------------------------
// Per-category targeted fix
// ---------------------------------------------------------------------------

export function fixByType(jsonText: string, fixType: FixType, objectInfo?: ObjectInfo): FixResult {
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
  let mediaFiles: string[] = []
  const breakdown: BreakdownItem[] = []

  switch (fixType) {
    case 'null-widget-value': {
      const c = objectInfo
        ? fixNullWidgetValues(workflow, objectInfo)
        : fixNullWidgetValuesOffline(workflow)
      if (c > 0) breakdown.push({ label: 'Null widget values replaced', count: c })
      break
    }
    case 'ghost-link': {
      // Ghost removal invalidates link type metadata, so run both in order.
      const ghostResult = fixGhostLinks(workflow)
      const typeMeta = fixLinkTypeMetadata(workflow)
      if (ghostResult.slotChanges > 0) breakdown.push({ label: 'Ghost link slot refs removed', count: ghostResult.slotChanges })
      if (ghostResult.nodeRefChanges > 0) breakdown.push({ label: 'Ghost node refs remapped', count: ghostResult.nodeRefChanges })
      if (typeMeta > 0) breakdown.push({ label: 'Link type labels corrected', count: typeMeta })
      break
    }
    case 'link-type-metadata': {
      const c = fixLinkTypeMetadata(workflow)
      if (c > 0) breakdown.push({ label: 'Link type labels corrected', count: c })
      break
    }
    case 'stale-media-ref': {
      const r = fixStaleMediaRefs(workflow)
      if (r.changes > 0) breakdown.push({ label: 'Stale media refs replaced', count: r.changes })
      mediaFiles = [...r.substituted]
      break
    }
    case 'bypassed-node': {
      const r = fixBypassedNodes(workflow, nodeTypeMap)
      if (r.partial) partial = true
      if (r.changes > 0) breakdown.push({ label: 'Bypassed nodes enabled', count: r.changes })
      break
    }
    case 'type-mismatch': {
      const r = fixTypeMismatch(workflow, nodeTypeMap)
      if (r.partial) partial = true
      if (r.changes > 0) breakdown.push({ label: 'Type conversion nodes inserted', count: r.changes })
      break
    }
    case 'disconnected-input': {
      const r = fixDisconnectedInputs(workflow, nodeTypeMap, objectInfo)
      if (r.partial) partial = true
      if (r.changes > 0) breakdown.push({ label: 'Disconnected inputs wired', count: r.changes })
      break
    }
  }

  const changes = breakdown.reduce((sum, item) => sum + item.count, 0)
  return { fixed: JSON.stringify(workflow, null, 2), changes, mediaFiles, partial, breakdown }
}
