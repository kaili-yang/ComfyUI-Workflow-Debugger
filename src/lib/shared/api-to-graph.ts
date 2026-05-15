import type { GraphWorkflow } from '../../types/workflow'

interface ApiNode {
  class_type: string
  inputs: Record<string, unknown>
}

export function apiToGraphWorkflow(parsed: Record<string, ApiNode>): GraphWorkflow {
  const nodes: GraphWorkflow['nodes'] = Object.keys(parsed).map((id) => ({
    id: Number(id),
    type: parsed[id].class_type,
  }))
  const links: GraphWorkflow['links'] = []
  let linkId = 1
  for (const [toId, node] of Object.entries(parsed)) {
    let toSlot = 0
    for (const value of Object.values(node.inputs)) {
      if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'number') {
        links.push([linkId++, Number(value[0]), value[1], Number(toId), toSlot, 'LINK'])
      }
      toSlot++
    }
  }
  return { nodes, links }
}
