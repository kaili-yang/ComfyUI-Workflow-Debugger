import type { Issue, WorkflowNode } from '../../types/workflow'
import type { GraphAnalysisContext } from '../shared/graph-context'

const MODE_LABELS: Record<number, string> = {
  0: 'active', 1: 'on-event', 2: 'muted', 3: 'on-trigger', 4: 'bypassed',
}

function modeLabel(mode: number): string {
  return MODE_LABELS[mode] ?? `mode-${mode}`
}

// A bypass is transparent when: the node has a connected input at the matching
// slot (or falls back to slot 0), and that input's type is compatible with the
// output type. Compatible = same type, or either side is wildcard '*'.
// Transparent bypass acts as a plain wire — the data flows through unchanged.
export function isBypassTransparent(fromNode: WorkflowNode, fromSlot: number): boolean {
  const inputSlot = fromNode.inputs?.[fromSlot] ?? fromNode.inputs?.[0]
  if (!inputSlot) return false
  if (inputSlot.link === null || inputSlot.link === undefined) return false
  const inputType  = String(inputSlot.type)
  const outputType = String(fromNode.outputs?.[fromSlot]?.type ?? '*')
  return inputType === outputType || inputType === '*' || outputType === '*'
}

export function checkMutedWithDependents(ctx: GraphAnalysisContext): Issue[] {
  const { nodeMap, linkMap } = ctx
  const issues: Issue[] = []

  for (const link of linkMap.values()) {
    const fromNode = nodeMap.get(link.fromNodeId)
    const toNode = nodeMap.get(link.toNodeId)
    if (!fromNode || !toNode) continue

    const mode = fromNode.mode ?? 0
    if (mode === 0) continue

    const label = modeLabel(mode)

    if (mode === 4) {
      // Bypassed: distinguish transparent passthrough (warning) from broken bypass (error)
      if (isBypassTransparent(fromNode, link.fromSlot)) {
        issues.push({
          severity: 'warning',
          nodeId: fromNode.id,
          nodeType: fromNode.type,
          message: `Node ${fromNode.type} (id: ${fromNode.id}) is bypassed — ${toNode.type} (id: ${toNode.id}) depends on its passthrough output`,
          detail: `Link #${link.id}: bypass passes '${(fromNode.inputs![link.fromSlot < (fromNode.inputs?.length ?? 0) ? link.fromSlot : 0]).type}' through as '${link.type}'`,
          suggestion: `The bypass is type-compatible and acts as a wire — confirm this is intentional`,
        })
      } else {
        issues.push({
          severity: 'error',
          nodeId: fromNode.id,
          nodeType: fromNode.type,
          message: `Node ${fromNode.type} (id: ${fromNode.id}) is bypassed but node ${toNode.type} (id: ${toNode.id}) depends on its output`,
          detail: `Link #${link.id} carries type '${link.type}' from bypassed node — bypass cannot produce valid output`,
          suggestion: `Enable the node to restore data flow`,
          fixable: true,
          fixType: 'bypassed-node',
        })
      }
    } else {
      // Muted (mode=2) or other non-active mode: always error, no passthrough at all
      issues.push({
        severity: 'error',
        nodeId: fromNode.id,
        nodeType: fromNode.type,
        message: `Node ${fromNode.type} (id: ${fromNode.id}) is ${label} but node ${toNode.type} (id: ${toNode.id}) depends on its output`,
        detail: `Link #${link.id} carries type '${link.type}' from ${label} node`,
        suggestion: `Either unmute node ${fromNode.type} (id: ${fromNode.id}), or disconnect its outputs`,
      })
    }
  }

  return issues
}

export function checkOrphans(ctx: GraphAnalysisContext): Issue[] {
  const { workflow } = ctx
  const issues: Issue[] = []

  for (const node of workflow.nodes) {
    const hasInputConnections =
      node.inputs?.some((i) => i.link !== null && i.link !== undefined) ?? false
    const hasOutputConnections =
      node.outputs?.some((o) => o.links && o.links.length > 0) ?? false
    const hasInputSlots = (node.inputs?.length ?? 0) > 0
    const hasOutputSlots = (node.outputs?.length ?? 0) > 0

    if (!hasInputConnections && !hasOutputConnections && (hasInputSlots || hasOutputSlots)) {
      issues.push({
        severity: 'info',
        nodeId: node.id,
        nodeType: node.type,
        message: `Node ${node.type} (id: ${node.id}) has no connections - it won't affect the workflow`,
      })
    }
  }

  return issues
}
