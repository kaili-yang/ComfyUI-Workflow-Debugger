import type { GraphWorkflow, NodeInputSlot, NodeOutputSlot, WorkflowNode } from '../../types/workflow'
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
  // At depth 0 (called directly from fixDisconnectedInputs after orphan search fails),
  // skip already-used outputs — reusing them causes semantic duplicates (e.g. the same
  // CONDITIONING wired to both positive and negative KSampler inputs).
  // At depth > 0 (wiring a newly-created node's own inputs), reuse any available output
  // so new nodes get connected to existing sources like CheckpointLoaderSimple.
  const forbidden = computeDescendants(workflow, targetNodeId)
  forbidden.add(targetNodeId)

  let bestReuse: { nodeId: number; slotIdx: number; score: number } | null = null

  for (const node of workflow.nodes) {
    if (forbidden.has(node.id)) continue
    for (let si = 0; si < (node.outputs?.length ?? 0); si++) {
      const out = node.outputs![si]
      if (out.type !== requiredType || out.type === '*') continue
      const outLinks = out.links?.length ?? 0
      if (outLinks > 0 && ctx.depth === 0) continue
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

    const newNode: WorkflowNode = {
      id: newId,
      type: src.class,
      pos,
      outputs: [{ name: requiredType, type: requiredType, links: [] as number[] }] as NodeOutputSlot[],
      inputs: (src.requiredInputs ?? []).map((ri) => ({
        name: ri.name,
        type: ri.type,
        link: null,
      })) as NodeInputSlot[],
      widgets_values: Object.values(src.widgetDefaults),
    }
    workflow.nodes.push(newNode)
    ctx.newNodeIds.push(newId)

    // Recursively satisfy the new node's required inputs at depth+1 so that
    // already-connected sources (e.g. CLIP from CheckpointLoaderSimple) are reused.
    const reqInputs = src.requiredInputs ?? []
    ctx.depth++
    for (let i = 0; i < reqInputs.length; i++) {
      satisfyInput(workflow, newId, i, reqInputs[i].type, nodeTypeMap, ctx)
    }
    ctx.depth--

    createLink(workflow, newId, src.outputSlot, targetNodeId, targetSlot, requiredType)
    ctx.visiting.delete(key)
    return { ok: true, newNodeIds: [...ctx.newNodeIds] }
  }

  ctx.visiting.delete(key)
  return { ok: false, reason: `no source for type '${requiredType}'` }
}
