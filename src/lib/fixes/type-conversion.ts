import type { GraphWorkflow, NodeInputSlot, NodeOutputSlot } from '../../types/workflow'
import type { NodeTypeMap } from '../shared/node-type-map'
import { createLink, nextNodeId, placeUpstream, removeLink } from '../shared/graph-utils'
import { makeSatisfyContext, satisfyInput } from '../shared/satisfy-input'

// Check 3 fix: insert conversion nodes for type-mismatched links.
export function fixTypeMismatch(
  workflow: GraphWorkflow,
  nodeTypeMap: NodeTypeMap,
): { changes: number; partial: boolean } {
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]))
  let changes = 0
  let partial  = false

  // Collect mismatches first — we'll mutate workflow.nodes/links during the loop
  type Mismatch = { linkId: number; fromNodeId: number; fromSlot: number; toNodeId: number; toSlot: number; sourceType: string; targetType: string }
  const mismatches: Mismatch[] = []

  for (const link of workflow.links) {
    const [linkId, fromNodeId, fromSlot, toNodeId, toSlot] = link
    const fromNode = nodeMap.get(fromNodeId)
    const toNode   = nodeMap.get(toNodeId)
    if (!fromNode || !toNode) continue

    const src = fromNode.outputs?.[fromSlot]
    const tgt = toNode.inputs?.[toSlot]
    if (!src || !tgt) continue
    if (src.type === tgt.type) continue
    if (src.type === '*' || tgt.type === '*') continue

    mismatches.push({
      linkId, fromNodeId, fromSlot, toNodeId, toSlot,
      sourceType: String(src.type),
      targetType: String(tgt.type),
    })
  }

  for (const mm of mismatches) {
    const { linkId, fromNodeId, fromSlot, toNodeId, toSlot, sourceType, targetType } = mm

    const convCandidates = nodeTypeMap.conversionMap[sourceType]?.[targetType]
    if (!convCandidates?.length) { partial = true; continue }

    // Choose simplest conversion (fewest extra required connection inputs)
    const convDef = [...convCandidates].sort(
      (a, b) => a.extraInputs.length - b.extraInputs.length,
    )[0]

    const fromNode = workflow.nodes.find((n) => n.id === fromNodeId)
    const toNode   = workflow.nodes.find((n) => n.id === toNodeId)
    if (!fromNode || !toNode) { partial = true; continue }

    // Insert conversion node
    const newId = nextNodeId(workflow)
    const pos   = placeUpstream(workflow, toNode, fromNode)

    // Build inputs array in slot order, merging main input + extraInputs
    const inputSlots: NodeInputSlot[] = []
    const allSlots = [
      { name: convDef.inputSlot, type: sourceType, slotIndex: convDef.inputSlotIndex },
      ...convDef.extraInputs,
    ].sort((a, b) => a.slotIndex - b.slotIndex)

    let mainSlotIndex = 0
    for (let i = 0; i < allSlots.length; i++) {
      const s = allSlots[i]
      inputSlots.push({ name: s.name, type: s.type, link: null })
      if (s.name === convDef.inputSlot) mainSlotIndex = i
    }

    const convNode = {
      id: newId,
      type: convDef.class,
      pos,
      inputs: inputSlots,
      outputs: [{ name: targetType, type: targetType, links: [] as number[] }] as NodeOutputSlot[],
    }
    workflow.nodes.push(convNode)
    nodeMap.set(newId, convNode)

    // Rebuild links: remove original, add A and B
    removeLink(workflow, linkId)
    createLink(workflow, fromNodeId, fromSlot, newId, mainSlotIndex, sourceType)
    createLink(workflow, newId, convDef.outputSlot, toNodeId, toSlot, targetType)
    changes++

    // Satisfy extraInputs recursively; use array index i (= connection-slot index)
    for (let i = 0; i < allSlots.length; i++) {
      const s = allSlots[i]
      if (s.name === convDef.inputSlot) continue
      const ctx = makeSatisfyContext()
      ctx.visiting.add(`${newId}:${mainSlotIndex}`)
      const res = satisfyInput(workflow, newId, i, s.type, nodeTypeMap, ctx)
      if (!res.ok) partial = true
    }
  }

  return { changes, partial }
}
