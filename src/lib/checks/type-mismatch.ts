import type { Issue } from '../../types/workflow'
import type { GraphAnalysisContext } from '../shared/graph-context'

export function checkTypeMismatch(ctx: GraphAnalysisContext): Issue[] {
  const { nodeMap, linkMap } = ctx
  const issues: Issue[] = []

  for (const link of linkMap.values()) {
    const fromNode = nodeMap.get(link.fromNodeId)
    const toNode = nodeMap.get(link.toNodeId)
    if (!fromNode || !toNode) continue

    const sourceOutput = fromNode.outputs?.[link.fromSlot]
    const targetInput = toNode.inputs?.[link.toSlot]

    if (sourceOutput && targetInput && sourceOutput.type !== targetInput.type) {
      if (sourceOutput.type !== '*' && targetInput.type !== '*') {
        issues.push({
          severity: 'error',
          nodeId: toNode.id,
          nodeType: toNode.type,
          message: `Type mismatch on link #${link.id}: '${sourceOutput.type}' connected to '${targetInput.type}'`,
          detail: `From ${fromNode.type} (id: ${fromNode.id}) output '${sourceOutput.name}' → ${toNode.type} (id: ${toNode.id}) input '${targetInput.name}'`,
          suggestion: `Disconnect link #${link.id} and reconnect a matching ${targetInput.type} output to ${toNode.type} (id: ${toNode.id}) input '${targetInput.name}'`,
        })
      }
    }
  }

  return issues
}
