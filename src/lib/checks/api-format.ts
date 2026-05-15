import type { Issue, ObjectInfo } from '../../types/workflow'
import { OUTPUT_NODE_TYPES } from '../shared/output-nodes'

interface ApiNode {
  class_type: string
  inputs: Record<string, unknown>
  _meta?: Record<string, unknown>
}

export function checkApiFormat(parsed: Record<string, ApiNode>, objectInfo?: ObjectInfo): Issue[] {
  const issues: Issue[] = []
  const nodeIds = new Set(Object.keys(parsed))

  for (const [nodeId, node] of Object.entries(parsed)) {
    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'string' &&
        typeof value[1] === 'number'
      ) {
        const refId = value[0] as string
        if (!nodeIds.has(refId)) {
          issues.push({
            severity: 'error',
            nodeType: node.class_type,
            message: `Node ${node.class_type} (id: ${nodeId}) input '${inputName}' references missing node id: ${refId}`,
            suggestion: `Add a node with id '${refId}' or rewire input '${inputName}' on node ${nodeId}`,
          })
        }
      }
    }
  }

  // Cycle detection
  const adj = new Map<string, string[]>()
  for (const id of nodeIds) adj.set(id, [])
  for (const [nodeId, node] of Object.entries(parsed)) {
    for (const value of Object.values(node.inputs)) {
      if (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'string' &&
        typeof value[1] === 'number' &&
        nodeIds.has(value[0] as string)
      ) {
        adj.get(value[0] as string)!.push(nodeId)
      }
    }
  }

  const color = new Map<string, 0 | 1 | 2>()
  for (const id of nodeIds) color.set(id, 0)
  let cycleFound = false
  let cyclePath: string[] = []

  function dfs(nodeId: string, stack: string[]): void {
    if (cycleFound) return
    color.set(nodeId, 1)
    stack.push(nodeId)
    for (const neighbor of adj.get(nodeId) ?? []) {
      if (cycleFound) return
      const c = color.get(neighbor) ?? 0
      if (c === 1) {
        cyclePath = stack.slice(stack.indexOf(neighbor))
        cycleFound = true
        return
      }
      if (c === 0) dfs(neighbor, stack)
    }
    stack.pop()
    color.set(nodeId, 2)
  }

  for (const id of nodeIds) {
    if ((color.get(id) ?? 0) === 0) {
      dfs(id, [])
      if (cycleFound) break
    }
  }

  if (cycleFound && cyclePath.length > 0) {
    const pathStr = cyclePath
      .map((id) => {
        const node = parsed[id]
        return node ? `${node.class_type}(${id})` : `?(${id})`
      })
      .join(' → ')
    const firstNode = parsed[cyclePath[0]]
    const firstLabel = firstNode
      ? `${firstNode.class_type}(${cyclePath[0]})`
      : `?(${cyclePath[0]})`
    issues.push({
      severity: 'error',
      message: `Circular dependency detected: ${pathStr} → ${firstLabel}`,
      suggestion: 'Remove one of the connections that forms the cycle',
    })
  }

  if (!Object.values(parsed).some((n) => OUTPUT_NODE_TYPES.has(n.class_type))) {
    issues.push({
      severity: 'warning',
      message:
        'No output node found (SaveImage, PreviewImage, etc.) - workflow produces no visible result',
      suggestion: 'Add a SaveImage or PreviewImage node and connect an IMAGE output to it',
    })
  }

  if (objectInfo) {
    for (const [nodeId, node] of Object.entries(parsed)) {
      if (!objectInfo[node.class_type]) {
        issues.push({
          severity: 'error',
          nodeType: node.class_type,
          message: `Node type '${node.class_type}' (id: ${nodeId}) is not registered in the connected ComfyUI instance`,
          suggestion: `Install the custom node pack that provides '${node.class_type}', or check that ComfyUI has loaded it correctly`,
        })
      }
    }
  }

  return issues
}
