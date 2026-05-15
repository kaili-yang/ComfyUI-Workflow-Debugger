import type { Issue } from '../../types/workflow'
import type { GraphAnalysisContext } from '../shared/graph-context'

const MODE_LABELS: Record<number, string> = {
  0: 'active', 1: 'on-event', 2: 'muted', 3: 'on-trigger', 4: 'bypassed',
}

function modeLabel(mode: number): string {
  return MODE_LABELS[mode] ?? `mode-${mode}`
}

export function checkMutedWithDependents(ctx: GraphAnalysisContext): Issue[] {
  const { nodeMap, linkMap } = ctx
  const issues: Issue[] = []

  for (const link of linkMap.values()) {
    const fromNode = nodeMap.get(link.fromNodeId)
    const toNode = nodeMap.get(link.toNodeId)
    if (!fromNode || !toNode) continue

    const mode = fromNode.mode ?? 0
    if (mode !== 0) {
      issues.push({
        severity: 'error',
        nodeId: fromNode.id,
        nodeType: fromNode.type,
        message: `Node ${fromNode.type} (id: ${fromNode.id}) is ${modeLabel(mode)} but node ${toNode.type} (id: ${toNode.id}) depends on its output`,
        detail: `Link #${link.id} carries type '${link.type}' from ${modeLabel(mode)} node`,
        suggestion: `Either unmute/unbypass node ${fromNode.type} (id: ${fromNode.id}), or disconnect its outputs`,
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
