import type { GraphWorkflow, ObjectInfo } from '../../types/workflow'
import type { NodeTypeMap } from '../shared/node-type-map'
import { computeAncestors, computeDescendants, computeTopoDepth, createLink } from '../shared/graph-utils'
import { makeSatisfyContext, satisfyInput } from '../shared/satisfy-input'

const OPTIONAL_SLOT_SHAPE = 7

// Check 4 fix: connect or insert nodes for unconnected required inputs.
export function fixDisconnectedInputs(
  workflow: GraphWorkflow,
  nodeTypeMap: NodeTypeMap,
  objectInfo?: ObjectInfo,
): { changes: number; partial: boolean } {
  let changes = 0
  let partial  = false

  // Snapshot nodes to iterate — satisfyInput may push new nodes during the loop
  const targetNodes = [...workflow.nodes]

  for (const node of targetNodes) {
    if (!node.inputs?.length) continue
    const schema = objectInfo?.[node.type]

    for (let slotIdx = 0; slotIdx < node.inputs.length; slotIdx++) {
      const input = node.inputs[slotIdx]

      // Already connected
      if (input.link !== null && input.link !== undefined) continue
      // Widget input
      if (input.widget != null) continue
      // Optional connection slot
      if (input.shape === OPTIONAL_SLOT_SHAPE) continue

      // Determine if required
      if (schema) {
        const inRequired = input.name in (schema.input.required ?? {})
        const inOptional = input.name in (schema.input.optional ?? {})
        if (inOptional) continue
        if (!inRequired) continue
      }

      const requiredType = String(input.type)
      if (requiredType === '*') continue

      // ---- Level 1a: free (unlinked) output slot of matching type ----
      const descendants = computeDescendants(workflow, node.id)
      const ancestors   = computeAncestors(workflow, node.id)
      descendants.add(node.id)

      type Candidate = { nodeId: number; slotIdx: number; score: number }
      const freeSlots: Candidate[] = []

      for (const candidate of workflow.nodes) {
        if (descendants.has(candidate.id)) continue
        for (let oi = 0; oi < (candidate.outputs?.length ?? 0); oi++) {
          const out = candidate.outputs![oi]
          if (out.type !== requiredType || out.type === '*') continue
          const isEmpty = !out.links?.length
          if (!isEmpty) continue
          let score = 0
          if (ancestors.has(candidate.id)) score += 2
          if ((candidate.outputs ?? []).some((o) => o.links?.length)) score += 1
          freeSlots.push({ nodeId: candidate.id, slotIdx: oi, score })
        }
      }

      if (freeSlots.length) {
        freeSlots.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          // Tiebreak: prefer topologically closer
          return (
            computeTopoDepth(workflow, b.nodeId) - computeTopoDepth(workflow, a.nodeId)
          )
        })
        const best = freeSlots[0]
        createLink(workflow, best.nodeId, best.slotIdx, node.id, slotIdx, requiredType)
        changes++
        continue
      }

      // ---- Level 1b: any (possibly already-used) matching output ----
      const reusable: Candidate[] = []

      for (const candidate of workflow.nodes) {
        if (descendants.has(candidate.id)) continue
        for (let oi = 0; oi < (candidate.outputs?.length ?? 0); oi++) {
          const out = candidate.outputs![oi]
          if (out.type !== requiredType || out.type === '*') continue
          let score = 0
          if (ancestors.has(candidate.id)) score += 2
          const totalOut = (candidate.outputs ?? []).reduce(
            (s, o) => s + (o.links?.length ?? 0), 0,
          )
          if (totalOut >= 2) score += 1
          reusable.push({ nodeId: candidate.id, slotIdx: oi, score })
        }
      }

      if (reusable.length) {
        reusable.sort((a, b) => b.score - a.score)
        const best = reusable[0]
        createLink(workflow, best.nodeId, best.slotIdx, node.id, slotIdx, requiredType)
        changes++
        continue
      }

      // ---- Level 2: insert a new node via satisfyInput ----
      const ctx = makeSatisfyContext()
      const res = satisfyInput(workflow, node.id, slotIdx, requiredType, nodeTypeMap, ctx)
      if (res.ok) {
        changes++
      } else {
        partial = true
      }
    }
  }

  return { changes, partial }
}
