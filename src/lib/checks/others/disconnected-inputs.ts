import type { Issue } from '../../../types/workflow'
import type { GraphAnalysisContext } from '../../shared/graph-context'

// RenderShape.HollowCircle = 7
// Source: ComfyUI_frontend/src/lib/litegraph/src/types/globalEnums.ts
// The ComfyUI frontend assigns this shape to connection slots that come from
// INPUT_TYPES()['optional'] (defined in ComfyUI/nodes.py), so
// input.shape === OPTIONAL_SLOT_SHAPE means the input is optional — no wire is valid.
const OPTIONAL_SLOT_SHAPE = 7

export function checkDisconnectedInputs(ctx: GraphAnalysisContext): Issue[] {
  const { workflow, objectInfo } = ctx
  const issues: Issue[] = []

  for (const node of workflow.nodes) {
    if (!node.inputs) continue
    const schemaDef = objectInfo?.[node.type]

    for (const input of node.inputs) {
      // Already wired — not an issue
      if (input.link !== null && input.link !== undefined) continue

      // Widget inputs (COMBO, INT, FLOAT, STRING, BOOLEAN) store their value in
      // widgets_values; a missing wire is expected and not an issue.
      if (input.widget != null) continue

      // Optional connection slots carry shape=7 (HollowCircle) set by the frontend
      // when the input originates from INPUT_TYPES()['optional']. No wire is valid.
      if (input.shape === OPTIONAL_SLOT_SHAPE) continue

      // With server schema: use authoritative required/optional distinction
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
        // Unknown input name (not in schema) → skip; schema mismatch caught elsewhere
        continue
      }

      // No schema, no optional marker, no widget — likely a required connection slot
      issues.push({
        severity: 'info',
        nodeId: node.id,
        nodeType: node.type,
        message: `Node ${node.type} (id: ${node.id}) input '${input.name}' (${input.type}) is not connected`,
        suggestion: `Connect a ${input.type} source, or connect to a ComfyUI server to validate whether this input is required`,
      })
    }
  }

  return issues
}
