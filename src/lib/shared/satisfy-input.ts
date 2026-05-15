import type { GraphWorkflow, NodeInputSlot, NodeOutputSlot } from '../../types/workflow'
import type { NodeTypeMap } from './node-type-map'
import {
  computeDescendants,
  createLink,
  nextNodeId,
  placeUpstream,
} from './graph-utils'

export interface SatisfyContext {
  visiting: Set<string>   // "${nodeId}:${slotIndex}" — cycle guard
  depth: number
  maxDepth: number
  newNodeIds: number[]
}

export type SatisfyResult =
  | { ok: true; newNodeIds: number[] }
  | { ok: false; reason: string }

export function makeSatisfyContext(): SatisfyContext {
  return { visiting: new Set(), depth: 0, maxDepth: 8, newNodeIds: [] }
}

export function satisfyInput(
  workflow: GraphWorkflow,
  targetNodeId: number,
  targetSlot: number,
  requiredType: string,
  nodeTypeMap: NodeTypeMap,
  ctx: SatisfyContext,
): SatisfyResult {
  if (ctx.depth >= ctx.maxDepth) {
    return { ok: false, reason: `max recursion depth exceeded` }
  }
  const key = `${targetNodeId}:${targetSlot}`
  if (ctx.visiting.has(key)) {
    return { ok: false, reason: `cycle detected at node ${targetNodeId} slot ${targetSlot}` }
  }
  if (requiredType === '*') {
    return { ok: false, reason: `cannot auto-satisfy wildcard type` }
  }

  const targetNode = workflow.nodes.find((n) => n.id === targetNodeId)
  if (!targetNode) return { ok: false, reason: `target node ${targetNodeId} not found` }

  ctx.visiting.add(key)

  // ---- Level 1: reuse an existing output in the workflow ----
  const forbidden = computeDescendants(workflow, targetNodeId)
  forbidden.add(targetNodeId)

  let bestReuse: { nodeId: number; slotIdx: number; score: number } | null = null

  for (const node of workflow.nodes) {
    if (forbidden.has(node.id)) continue
    for (let si = 0; si < (node.outputs?.length ?? 0); si++) {
      const out = node.outputs![si]
      if (out.type !== requiredType || out.type === '*') continue
      const outLinks = out.links?.length ?? 0
      // Prefer already-used outputs (trunk nodes like MODEL/VAE/CLIP) over unused
      const score = outLinks > 0 ? 2 : 1
      if (!bestReuse || score > bestReuse.score) {
        bestReuse = { nodeId: node.id, slotIdx: si, score }
      }
    }
  }

  if (bestReuse) {
    createLink(workflow, bestReuse.nodeId, bestReuse.slotIdx, targetNodeId, targetSlot, requiredType)
    ctx.visiting.delete(key)
    return { ok: true, newNodeIds: [] }
  }

  // ---- Level 2: insert a source node from SourceMap ----
  const sources = nodeTypeMap.sourceMap[requiredType]
  if (sources?.length) {
    const src = sources[0]
    const newId = nextNodeId(workflow)
    const pos = placeUpstream(workflow, targetNode, null)

    const newNode = {
      id: newId,
      type: src.class,
      pos,
      outputs: [{ name: requiredType, type: requiredType, links: [] as number[] }] as NodeOutputSlot[],
      inputs: [] as NodeInputSlot[],
      widgets_values: Object.values(src.widgetDefaults),
    }
    workflow.nodes.push(newNode)
    ctx.newNodeIds.push(newId)

    createLink(workflow, newId, src.outputSlot, targetNodeId, targetSlot, requiredType)
    ctx.visiting.delete(key)
    return { ok: true, newNodeIds: [newId] }
  }

  ctx.visiting.delete(key)
  return { ok: false, reason: `no source for type '${requiredType}'` }
}
