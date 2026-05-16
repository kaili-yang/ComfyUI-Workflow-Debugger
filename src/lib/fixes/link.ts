import type { GraphWorkflow, WorkflowNode } from '../../types/workflow'
import { computeTopoDepth } from '../shared/graph-utils'

// ---- Check 1a: ghost link IDs in slots ----

function fixGhostLinkSlots(workflow: GraphWorkflow): number {
  let changes = 0
  const validIds = new Set(workflow.links.map((l) => l[0]))

  for (const node of workflow.nodes) {
    for (const input of node.inputs ?? []) {
      if (input.link !== null && input.link !== undefined && !validIds.has(input.link)) {
        input.link = null
        changes++
      }
    }
    for (const output of node.outputs ?? []) {
      if (Array.isArray(output.links)) {
        const before = output.links.length
        output.links = output.links.filter((id) => validIds.has(id))
        changes += before - output.links.length
      }
    }
  }
  return changes
}

// ---- Check 1b: ghost node refs — smart remapping ----

function scoreFromCandidate(
  candidate: WorkflowNode,
  link: GraphWorkflow['links'][number],
  workflow: GraphWorkflow,
): number {
  const [, fromNodeId, fromSlot, toNodeId, , linkType] = link
  let score = 0

  // ID proximity (small drift is most common)
  const dist = Math.abs(candidate.id - fromNodeId)
  if (dist <= 2) score += 2
  else if (dist <= 10) score += 1

  // Topological depth: candidate should be shallower than toNode
  const toDepth  = computeTopoDepth(workflow, toNodeId)
  const candDepth = computeTopoDepth(workflow, candidate.id)
  if (candDepth < toDepth) score += 1

  // Exact type match (not wildcard)
  const outType = candidate.outputs?.[fromSlot]?.type
  if (outType === linkType) score += 1

  return score
}

function scoreToCandidate(
  candidate: WorkflowNode,
  link: GraphWorkflow['links'][number],
  workflow: GraphWorkflow,
): number {
  const [, fromNodeId, , toNodeId, toSlot, linkType] = link
  let score = 0

  const dist = Math.abs(candidate.id - toNodeId)
  if (dist <= 2) score += 2
  else if (dist <= 10) score += 1

  const fromDepth = computeTopoDepth(workflow, fromNodeId)
  const candDepth = computeTopoDepth(workflow, candidate.id)
  if (candDepth > fromDepth) score += 1

  const inType = candidate.inputs?.[toSlot]?.type
  if (inType === linkType) score += 1

  return score
}

function remapLink(
  workflow: GraphWorkflow,
  nodeMap: Map<number, WorkflowNode>,
  linkIdx: number,
): boolean {
  const link = workflow.links[linkIdx]
  const [linkId, fromNodeId, fromSlot, toNodeId, toSlot, linkType] = link

  const fromMissing = !nodeMap.has(fromNodeId)
  const toMissing   = !nodeMap.has(toNodeId)

  // Both missing — delete outright
  if (fromMissing && toMissing) {
    workflow.links.splice(linkIdx, 1)
    return true
  }

  if (fromMissing) {
    const candidates = workflow.nodes
      .filter(
        (n) =>
          n.id !== toNodeId &&
          n.outputs?.[fromSlot] !== undefined &&
          (n.outputs[fromSlot].type === linkType ||
            n.outputs[fromSlot].type === '*' ||
            linkType === '*'),
      )
      .map((n) => ({ node: n, score: scoreFromCandidate(n, link, workflow) }))
      .sort((a, b) => b.score - a.score)

    if (!candidates.length) {
      workflow.links.splice(linkIdx, 1)
      return true
    }
    if (candidates.length === 1 || candidates[0].score - candidates[1].score > 1) {
      const best = candidates[0].node
      link[1] = best.id
      best.outputs![fromSlot].links ??= []
      best.outputs![fromSlot].links!.push(linkId)
      return true
    }
    // Ambiguous — leave unchanged
    return false
  }

  if (toMissing) {
    const candidates = workflow.nodes
      .filter(
        (n) =>
          n.id !== fromNodeId &&
          n.inputs?.[toSlot] !== undefined &&
          (n.inputs[toSlot].type === linkType ||
            n.inputs[toSlot].type === '*' ||
            linkType === '*'),
      )
      .map((n) => ({ node: n, score: scoreToCandidate(n, link, workflow) }))
      .sort((a, b) => b.score - a.score)

    if (!candidates.length) {
      workflow.links.splice(linkIdx, 1)
      return true
    }
    if (candidates.length === 1 || candidates[0].score - candidates[1].score > 1) {
      const best = candidates[0].node
      link[3] = best.id
      best.inputs![toSlot].link = linkId
      return true
    }
    return false
  }

  return false
}

function fixGhostNodeRefs(workflow: GraphWorkflow): number {
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]))
  let changes = 0
  let i = 0
  while (i < workflow.links.length) {
    const link = workflow.links[i]
    const fromMissing = !nodeMap.has(link[1])
    const toMissing   = !nodeMap.has(link[3])
    if (fromMissing || toMissing) {
      const changed = remapLink(workflow, nodeMap, i)
      if (changed) {
        changes++
        // After splice the next link is now at index i; don't advance
        if (!workflow.links[i] || workflow.links[i][0] !== link[0]) continue
      }
    }
    i++
  }
  return changes
}

// ---- Check 2: link type metadata ----

function fixLinkTypeMetadata(workflow: GraphWorkflow): number {
  let changes = 0
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]))

  for (const link of workflow.links) {
    const fromNode = nodeMap.get(link[1])
    if (!fromNode) continue
    const out = fromNode.outputs?.[link[2]]
    if (!out) continue

    if (link[5] !== out.type) {
      link[5] = out.type
      changes++
    }
  }
  return changes
}

// ---- Public exports ----

export function fixGhostLinks(workflow: GraphWorkflow): { slotChanges: number; nodeRefChanges: number } {
  return {
    slotChanges: fixGhostLinkSlots(workflow),
    nodeRefChanges: fixGhostNodeRefs(workflow),
  }
}

export { fixLinkTypeMetadata }
