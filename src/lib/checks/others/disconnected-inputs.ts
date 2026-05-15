import type { Issue } from '../../../types/workflow'
import type { GraphAnalysisContext } from '../../shared/graph-context'

export function checkDisconnectedInputs(ctx: GraphAnalysisContext): Issue[] {
  const { workflow, objectInfo } = ctx
  const issues: Issue[] = []

  for (const node of workflow.nodes) {
    if (!node.inputs) continue
    const schemaDef = objectInfo?.[node.type]
    for (const input of node.inputs) {
      if (input.link !== null && input.link !== undefined) continue

      if (schemaDef) {
        const isRequired = input.name in (schemaDef.input.required ?? {})
        const isOptional = input.name in (schemaDef.input.optional ?? {})
        if (isOptional) continue
        if (isRequired) {
          issues.push({
            severity: 'warning',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) required input '${input.name}' (${input.type}) is not connected`,
            suggestion: `Connect a ${input.type} output to '${input.name}'`,
          })
        }
        continue
      }

      issues.push({
        severity: 'info',
        nodeId: node.id,
        nodeType: node.type,
        message: `Node ${node.type} (id: ${node.id}) input '${input.name}' (${input.type}) is not connected`,
        suggestion: `Connect a ${input.type} source, or connect to ComfyUI server to validate required inputs`,
      })
    }
  }

  return issues
}
