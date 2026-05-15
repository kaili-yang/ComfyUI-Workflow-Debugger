import type { Issue } from '../../types/workflow'
import type { GraphAnalysisContext } from '../shared/graph-context'

export function checkLinkIntegrity(ctx: GraphAnalysisContext): Issue[] {
  const { workflow, nodeMap, linkMap } = ctx
  const issues: Issue[] = []

  for (const node of workflow.nodes) {
    for (const input of node.inputs ?? []) {
      if (input.link !== null && input.link !== undefined && !linkMap.has(input.link)) {
        issues.push({
          severity: 'error',
          nodeId: node.id,
          nodeType: node.type,
          message: `Node ${node.type} (id: ${node.id}) input '${input.name}' references missing link #${input.link}`,
          suggestion: `Remove or reconnect node ${node.type} (id: ${node.id}) - link #${input.link} is missing`,
          fixable: true,
        })
      }
    }
    for (const output of node.outputs ?? []) {
      for (const linkId of output.links ?? []) {
        if (!linkMap.has(linkId)) {
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) output '${output.name}' references missing link #${linkId}`,
            suggestion: `Remove or reconnect node ${node.type} (id: ${node.id}) - link #${linkId} is missing`,
            fixable: true,
          })
        }
      }
    }
  }

  for (const link of linkMap.values()) {
    if (!nodeMap.has(link.fromNodeId)) {
      issues.push({
        severity: 'error',
        message: `Link #${link.id} references non-existent source node id: ${link.fromNodeId}`,
        suggestion: `Remap or remove link #${link.id} - source node ${link.fromNodeId} does not exist`,
        fixable: true,
      })
    }
    if (!nodeMap.has(link.toNodeId)) {
      issues.push({
        severity: 'error',
        message: `Link #${link.id} references non-existent target node id: ${link.toNodeId}`,
        suggestion: `Remap or remove link #${link.id} - target node ${link.toNodeId} does not exist`,
        fixable: true,
      })
    }
  }

  return issues
}

export function checkLinkTypeMetadata(ctx: GraphAnalysisContext): Issue[] {
  const { nodeMap, linkMap } = ctx
  const issues: Issue[] = []

  for (const link of linkMap.values()) {
    const fromNode = nodeMap.get(link.fromNodeId)
    const toNode = nodeMap.get(link.toNodeId)
    if (!fromNode || !toNode) continue

    const sourceOutput = fromNode.outputs?.[link.fromSlot]
    if (sourceOutput && sourceOutput.type !== link.type) {
      issues.push({
        severity: 'warning',
        nodeId: fromNode.id,
        nodeType: fromNode.type,
        message: `Link #${link.id}: source output type '${sourceOutput.type}' disagrees with link type '${link.type}'`,
        detail: `Node ${fromNode.type} (id: ${fromNode.id}) slot ${link.fromSlot} → ${toNode.type} (id: ${toNode.id})`,
        suggestion: `Update link type to '${sourceOutput.type}' to match the output slot`,
        fixable: true,
      })
    }
  }

  return issues
}
