import type { GraphWorkflow, ObjectInfo, WorkflowLink, WorkflowNode } from '../../types/workflow'

export interface GraphAnalysisContext {
  workflow: GraphWorkflow
  nodeMap: Map<number, WorkflowNode>
  linkMap: Map<number, WorkflowLink>
  objectInfo?: ObjectInfo
}

export function buildContext(workflow: GraphWorkflow, objectInfo?: ObjectInfo): GraphAnalysisContext {
  const nodeMap = new Map<number, WorkflowNode>()
  for (const node of workflow.nodes) nodeMap.set(node.id, node)

  const linkMap = new Map<number, WorkflowLink>()
  for (const raw of workflow.links) {
    const [id, fromNodeId, fromSlot, toNodeId, toSlot, type] = raw
    linkMap.set(id, { id, fromNodeId, fromSlot, toNodeId, toSlot, type })
  }

  return { workflow, nodeMap, linkMap, objectInfo }
}
