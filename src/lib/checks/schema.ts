import type { Issue, NodeInputConfig, WorkflowNode } from '../../types/workflow'
import type { GraphAnalysisContext } from '../shared/graph-context'

const WIDGET_PRIMITIVE_TYPES = new Set(['INT', 'FLOAT', 'STRING', 'BOOLEAN'])

function checkWidgetValues(
  node: WorkflowNode,
  schemaDef: {
    input: {
      required?: Record<string, [string | string[], NodeInputConfig?]>
      optional?: Record<string, [string | string[], NodeInputConfig?]>
    }
  },
): Issue[] {
  const issues: Issue[] = []
  const values = node.widgets_values
  if (!values?.length) return issues

  const allInputs: [string, [string | string[], NodeInputConfig?]][] = [
    ...Object.entries(schemaDef.input.required ?? {}),
    ...Object.entries(schemaDef.input.optional ?? {}),
  ]

  const connectedInputs = new Set(
    (node.inputs ?? [])
      .filter((i) => i.link !== null && i.link !== undefined)
      .map((i) => i.name),
  )

  let widgetIdx = 0
  for (const [inputName, inputDef] of allInputs) {
    if (widgetIdx >= values.length) break
    const [inputType, config] = inputDef
    const isCombo = Array.isArray(inputType)
    const isPrimitive = !isCombo && WIDGET_PRIMITIVE_TYPES.has(inputType as string)
    if (!isCombo && !isPrimitive) continue
    if (connectedInputs.has(inputName)) continue

    const value = values[widgetIdx++]
    const cfg = (config ?? {}) as NodeInputConfig

    if (isCombo) {
      const options = inputType as string[]
      if (typeof value === 'string' && options.length > 0 && !options.includes(value)) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          nodeType: node.type,
          message: `Node ${node.type} (id: ${node.id}) input '${inputName}': value '${value}' is not in the allowed options`,
          suggestion: `Valid options: ${options.slice(0, 8).join(', ')}${options.length > 8 ? ' …' : ''}`,
        })
      }
    } else if (inputType === 'INT' || inputType === 'FLOAT') {
      if (value === null || value === undefined) {
        const fallback = typeof cfg.default === 'number' ? cfg.default : 0
        issues.push({
          severity: 'error',
          nodeId: node.id,
          nodeType: node.type,
          message: `Node ${node.type} (id: ${node.id}) input '${inputName}' is null — backend will throw int(None)`,
          suggestion: `Will be replaced with ${fallback}`,
          fixable: true,
          fixType: 'null-widget-value',
        })
        continue
      }
      const num = Number(value)
      if (!Number.isNaN(num)) {
        if (cfg.min !== undefined && num < (cfg.min as number)) {
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) input '${inputName}' value ${num} is below minimum ${cfg.min}`,
            suggestion: `Set '${inputName}' to a value ≥ ${cfg.min}`,
          })
        }
        if (cfg.max !== undefined && num > (cfg.max as number)) {
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) input '${inputName}' value ${num} exceeds maximum ${cfg.max}`,
            suggestion: `Set '${inputName}' to a value ≤ ${cfg.max}`,
          })
        }
      }
    }
  }
  return issues
}

export function checkSchema(ctx: GraphAnalysisContext): Issue[] {
  const { workflow, objectInfo } = ctx
  if (!objectInfo) return []
  const issues: Issue[] = []

  for (const node of workflow.nodes) {
    const schemaDef = objectInfo[node.type]
    if (!schemaDef) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        nodeType: node.type,
        message: `Node type '${node.type}' (id: ${node.id}) is not registered in the connected ComfyUI instance`,
        suggestion: `Install the custom node pack that provides '${node.type}', or check that ComfyUI has loaded it correctly`,
      })
      continue
    }
    issues.push(...checkWidgetValues(node, schemaDef))
  }

  return issues
}
