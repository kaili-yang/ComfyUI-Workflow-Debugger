import type { GraphWorkflow, WorkflowNode } from '../../types/workflow'
import type { NodeTypeMap } from '../shared/node-type-map'
import { makeSatisfyContext, satisfyInput } from '../shared/satisfy-input'

const OPTIONAL_SLOT_SHAPE = 7

// Mirrors isBypassTransparent in checks/node-state.ts — same predicate, local copy.
function isTransparentBypass(fromNode: WorkflowNode, fromSlot: number): boolean {
  const inputSlot = fromNode.inputs?.[fromSlot] ?? fromNode.inputs?.[0]
  if (!inputSlot) return false
  if (inputSlot.link === null || inputSlot.link === undefined) return false
  const inputType  = String(inputSlot.type)
  const outputType = String(fromNode.outputs?.[fromSlot]?.type ?? '*')
  return inputType === outputType || inputType === '*' || outputType === '*'
}

// Check 5 fix: enable bypassed nodes whose bypass cannot produce valid output.
//
// Strategy:
//   1. Collect bypassed nodes that have at least one non-transparent output link
//      (these are the error-level cases).
//   2. For each: satisfy any required unconnected connection inputs via satisfyInput
//      (Level 1 reuses existing outputs; Level 2 inserts a source node).
//   3. If all required inputs are satisfied, set mode=0 (enable the node).
//
// Transparent bypasses (warning-level) are left unchanged — they are intentional.
export function fixBypassedNodes(
  workflow: GraphWorkflow,
  nodeTypeMap: NodeTypeMap,
): { changes: number; partial: boolean } {
  let changes = 0
  let partial  = false

  // Deduplicate: one entry per bypassed node, keyed by node ID
  const errorBypassedIds = new Set<number>()
  for (const link of workflow.links) {
    const fromNode = workflow.nodes.find((n) => n.id === link[1])
    if (!fromNode || fromNode.mode !== 4) continue
    if (!isTransparentBypass(fromNode, link[2])) {
      errorBypassedIds.add(fromNode.id)
    }
  }

  for (const nodeId of errorBypassedIds) {
    const node = workflow.nodes.find((n) => n.id === nodeId)
    if (!node) continue

    let allSatisfied = true

    for (let slotIdx = 0; slotIdx < (node.inputs?.length ?? 0); slotIdx++) {
      const input = node.inputs![slotIdx]
      if (input.link !== null && input.link !== undefined) continue
      if (input.widget != null) continue
      if (input.shape === OPTIONAL_SLOT_SHAPE) continue

      const requiredType = String(input.type)
      if (requiredType === '*') continue

      const ctx = makeSatisfyContext()
      const res = satisfyInput(workflow, node.id, slotIdx, requiredType, nodeTypeMap, ctx)
      if (!res.ok) {
        allSatisfied = false
        partial = true
      }
    }

    if (allSatisfied) {
      node.mode = 0
      changes++
    }
  }

  return { changes, partial }
}
