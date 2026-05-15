import type { GraphWorkflow, SlotType, WorkflowNode } from '../../types/workflow'

// ---- Ancestor / descendant traversal ----

export function computeAncestors(workflow: GraphWorkflow, nodeId: number): Set<number> {
  const ancestors = new Set<number>()
  const queue = [nodeId]
  while (queue.length) {
    const cur = queue.shift()!
    for (const link of workflow.links) {
      if (link[3] !== cur) continue
      const fromId = link[1]
      if (fromId === nodeId || ancestors.has(fromId)) continue
      ancestors.add(fromId)
      queue.push(fromId)
    }
  }
  return ancestors
}

export function computeDescendants(workflow: GraphWorkflow, nodeId: number): Set<number> {
  const descendants = new Set<number>()
  const queue = [nodeId]
  while (queue.length) {
    const cur = queue.shift()!
    for (const link of workflow.links) {
      if (link[1] !== cur) continue
      const toId = link[3]
      if (toId === nodeId || descendants.has(toId)) continue
      descendants.add(toId)
      queue.push(toId)
    }
  }
  return descendants
}

// Longest path length from any source to nodeId (topological depth).
// Returns 0 for isolated or unreachable nodes.
export function computeTopoDepth(workflow: GraphWorkflow, nodeId: number): number {
  const nodeIds = new Set(workflow.nodes.map((n) => n.id))
  const inDegree = new Map<number, number>()
  const forward = new Map<number, number[]>()
  for (const id of nodeIds) { inDegree.set(id, 0); forward.set(id, []) }

  for (const link of workflow.links) {
    const [, from, , to] = link
    if (!nodeIds.has(from) || !nodeIds.has(to)) continue
    forward.get(from)!.push(to)
    inDegree.set(to, inDegree.get(to)! + 1)
  }

  const depth = new Map<number, number>()
  const queue: number[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) { queue.push(id); depth.set(id, 0) }
  }
  while (queue.length) {
    const cur = queue.shift()!
    for (const next of forward.get(cur) ?? []) {
      const nd = depth.get(cur)! + 1
      if (!depth.has(next) || depth.get(next)! < nd) depth.set(next, nd)
      inDegree.set(next, inDegree.get(next)! - 1)
      if (inDegree.get(next) === 0) queue.push(next)
    }
  }
  return depth.get(nodeId) ?? 0
}

// ---- ID allocation ----

export function nextNodeId(workflow: GraphWorkflow): number {
  const base =
    workflow.last_node_id ??
    workflow.nodes.reduce((m, n) => Math.max(m, n.id), 0)
  const id = base + 1
  workflow.last_node_id = id
  return id
}

export function nextLinkId(workflow: GraphWorkflow): number {
  const base =
    workflow.last_link_id ??
    workflow.links.reduce((m, l) => Math.max(m, l[0]), 0)
  const id = base + 1
  workflow.last_link_id = id
  return id
}

// ---- Node placement ----

const NODE_W = 210
const NODE_H = 110
const GAP_X  = 50

export function placeUpstream(
  workflow: GraphWorkflow,
  targetNode: WorkflowNode,
  referenceNode: WorkflowNode | null,
): [number, number] {
  if (!targetNode.pos) return [100, 100]

  const [tx, ty] = targetNode.pos
  let baseX = (referenceNode?.pos ? referenceNode.pos[0] : tx) - NODE_W - GAP_X
  let baseY = referenceNode?.pos ? referenceNode.pos[1] : ty

  // Shift up until no overlap
  for (let attempt = 0; attempt < 20; attempt++) {
    const collision = workflow.nodes.some(
      (n) =>
        n.pos &&
        Math.abs(n.pos[0] - baseX) < NODE_W &&
        Math.abs(n.pos[1] - baseY) < NODE_H,
    )
    if (!collision) break
    baseY -= NODE_H + 10
  }
  return [baseX, baseY]
}

// ---- Link mutation ----

export function createLink(
  workflow: GraphWorkflow,
  fromNodeId: number,
  fromSlot: number,
  toNodeId: number,
  toSlot: number,
  linkType: SlotType,
): number {
  const id = nextLinkId(workflow)
  workflow.links.push([id, fromNodeId, fromSlot, toNodeId, toSlot, linkType])

  const fromNode = workflow.nodes.find((n) => n.id === fromNodeId)
  if (fromNode?.outputs?.[fromSlot]) {
    fromNode.outputs[fromSlot].links ??= []
    fromNode.outputs[fromSlot].links!.push(id)
  }

  const toNode = workflow.nodes.find((n) => n.id === toNodeId)
  if (toNode?.inputs?.[toSlot]) {
    toNode.inputs[toSlot].link = id
  }

  return id
}

export function removeLink(workflow: GraphWorkflow, linkId: number): void {
  workflow.links = workflow.links.filter((l) => l[0] !== linkId)
  for (const node of workflow.nodes) {
    for (const output of node.outputs ?? []) {
      if (Array.isArray(output.links)) {
        output.links = output.links.filter((id) => id !== linkId)
      }
    }
    for (const input of node.inputs ?? []) {
      if (input.link === linkId) input.link = null
    }
  }
}
