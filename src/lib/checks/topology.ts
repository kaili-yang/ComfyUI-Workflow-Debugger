import type { Issue } from '../../types/workflow'
import type { GraphAnalysisContext } from '../shared/graph-context'
import { OUTPUT_NODE_TYPES } from '../shared/output-nodes'

export function checkNoOutputNode(ctx: GraphAnalysisContext): Issue[] {
  if (ctx.workflow.nodes.some((n) => OUTPUT_NODE_TYPES.has(n.type))) return []
  return [
    {
      severity: 'warning',
      message: 'No output node found (SaveImage, PreviewImage, etc.) - workflow produces no visible result',
      suggestion: 'Add a SaveImage or PreviewImage node and connect an IMAGE output to it',
    },
  ]
}

export function checkCycles(ctx: GraphAnalysisContext): Issue[] {
  const { workflow, nodeMap, linkMap } = ctx
  const issues: Issue[] = []

  const adj = new Map<number, number[]>()
  for (const node of workflow.nodes) adj.set(node.id, [])
  for (const link of linkMap.values()) {
    if (nodeMap.has(link.fromNodeId) && nodeMap.has(link.toNodeId)) {
      adj.get(link.fromNodeId)!.push(link.toNodeId)
    }
  }

  const color = new Map<number, 0 | 1 | 2>()
  for (const node of workflow.nodes) color.set(node.id, 0)

  let cycleFound = false
  let cyclePath: number[] = []

  function dfs(nodeId: number, stack: number[]): void {
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

  for (const node of workflow.nodes) {
    if ((color.get(node.id) ?? 0) === 0) {
      dfs(node.id, [])
      if (cycleFound) break
    }
  }

  if (cycleFound && cyclePath.length > 0) {
    const pathStr = cyclePath
      .map((id) => {
        const n = nodeMap.get(id)
        return n ? `${n.type}(${id})` : `?(${id})`
      })
      .join(' → ')
    const first = nodeMap.get(cyclePath[0])
    const firstLabel = first ? `${first.type}(${cyclePath[0]})` : `?(${cyclePath[0]})`
    issues.push({
      severity: 'error',
      message: `Circular dependency detected: ${pathStr} → ${firstLabel}`,
      suggestion: 'Remove one of the connections that forms the cycle',
    })
  }

  return issues
}
