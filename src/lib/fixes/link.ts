import type { GraphWorkflow } from '../../types/workflow'

export function fixGhostLinks(workflow: GraphWorkflow): number {
  let changes = 0
  const nodeIds = new Set(workflow.nodes.map((n) => n.id))

  const before = workflow.links.length
  workflow.links = workflow.links.filter((l) => nodeIds.has(l[1]) && nodeIds.has(l[3]))
  changes += before - workflow.links.length

  const validLinkIds = new Set(workflow.links.map((l) => l[0]))
  for (const node of workflow.nodes) {
    for (const input of node.inputs ?? []) {
      if (input.link !== null && input.link !== undefined && !validLinkIds.has(input.link)) {
        input.link = null
        changes++
      }
    }
    for (const output of node.outputs ?? []) {
      if (Array.isArray(output.links)) {
        const beforeCount = output.links.length
        output.links = output.links.filter((id) => validLinkIds.has(id))
        changes += beforeCount - output.links.length
      }
    }
  }

  return changes
}

export function fixLinkTypeMetadata(workflow: GraphWorkflow): number {
  let changes = 0
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]))

  for (const link of workflow.links) {
    const fromNode = nodeMap.get(link[1])
    if (!fromNode) continue
    const outputSlot = fromNode.outputs?.[link[2]]
    if (!outputSlot) continue
    if (outputSlot.type !== link[5]) {
      link[5] = outputSlot.type
      changes++
    }
  }

  return changes
}
