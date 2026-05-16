import type { Issue } from '../../../types/workflow'
import type { StaticSchema } from '../../../types/workflow'
import type { GraphAnalysisContext } from '../../shared/graph-context'
import staticSchemaData from '../../nodes_schema.json'

const SCHEMA = staticSchemaData as StaticSchema

const WIDGET_PRIMITIVE_TYPES = new Set(['INT', 'FLOAT', 'STRING', 'BOOLEAN'])

export function checkNullWidgetValues(ctx: GraphAnalysisContext): Issue[] {
  // objectInfo path: checks/schema.ts already handles null INT/FLOAT via live schema.
  // This check covers the offline case and the STRING/COMBO cases that schema.ts misses.
  const { workflow, objectInfo } = ctx
  if (objectInfo) return []

  const issues: Issue[] = []

  for (const node of workflow.nodes) {
    const schemaDef = SCHEMA[node.type]
    if (!schemaDef || !node.widgets_values?.length) continue

    const allInputs = [
      ...Object.entries(schemaDef.inputs.required),
      ...Object.entries(schemaDef.inputs.optional),
    ]

    const connectedInputs = new Set(
      (node.inputs ?? [])
        .filter((i) => i.link !== null && i.link !== undefined)
        .map((i) => i.name),
    )

    const cagInputs = new Set(schemaDef.control_after_generate ?? [])

    let widgetIdx = 0
    for (const [inputName, inputType] of allInputs) {
      if (widgetIdx >= node.widgets_values.length) break

      const isCombo = inputType === 'COMBO'
      const isPrimitive = WIDGET_PRIMITIVE_TYPES.has(inputType)
      if (!isCombo && !isPrimitive) continue
      if (connectedInputs.has(inputName)) continue

      // Case 1 & INT-with-CAG: INT with control_after_generate — consume the INT
      // slot then skip the extra frontend-injected CAG COMBO slot.
      if (inputType === 'INT' && cagInputs.has(inputName)) {
        const value = node.widgets_values[widgetIdx]
        widgetIdx++

        if (value === null || value === undefined) {
          // Case 1: INT null → runtime crash (int(None) → TypeError)
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) input '${inputName}' is null — backend will throw int(None)`,
            suggestion: 'Replace with 0 or a valid integer',
            fixable: true,
            fixType: 'null-widget-value' as const,
          })
        }

        // Case 6: control_after_generate COMBO slot — frontend-only, no backend effect.
        if (widgetIdx < node.widgets_values.length) {
          const cagValue = node.widgets_values[widgetIdx]
          widgetIdx++
          if (cagValue === null || cagValue === undefined) {
            issues.push({
              severity: 'info',
              nodeId: node.id,
              nodeType: node.type,
              message: `Node ${node.type} (id: ${node.id}) seed control mode for '${inputName}' is null — frontend behavior undefined`,
              suggestion: 'Replace with "fixed", "randomize", "increment", or "decrement"',
              fixable: true,
            fixType: 'null-widget-value' as const,
            })
          }
        }
        continue
      }

      const value = node.widgets_values[widgetIdx]
      widgetIdx++

      if (value === null || value === undefined) {
        if (inputType === 'INT') {
          // Case 1: INT null → int(None) → TypeError in execution.py
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) input '${inputName}' is null — backend will throw int(None)`,
            suggestion: 'Replace with 0 or a valid integer',
            fixable: true,
            fixType: 'null-widget-value' as const,
          })
        } else if (inputType === 'FLOAT') {
          // Case 2: FLOAT null → float(None) → TypeError in execution.py
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) input '${inputName}' is null — backend will throw float(None)`,
            suggestion: 'Replace with 0.0 or a valid number',
            fixable: true,
            fixType: 'null-widget-value' as const,
          })
        } else if (inputType === 'STRING') {
          // Case 3: STRING null → str(None) = "None" — no crash but silently pollutes output
          issues.push({
            severity: 'warning',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) input '${inputName}' is null — backend receives the string "None" instead of empty text`,
            suggestion: 'Replace with an empty string or the intended text',
            fixable: true,
            fixType: 'null-widget-value' as const,
          })
        } else if (inputType === 'COMBO') {
          // Case 5: COMBO null → passed directly to node function → runtime crash
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) input '${inputName}' is null — backend will crash (no valid option selected)`,
            suggestion: 'Select a valid option from the dropdown',
          })
        }
        // Case 4: BOOLEAN null → bool(None) = False — safe, no issue emitted
      }
    }
  }

  return issues
}
