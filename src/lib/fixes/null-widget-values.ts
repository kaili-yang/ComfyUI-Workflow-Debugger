import type { GraphWorkflow } from '../../types/workflow'
import type { StaticSchema } from '../../types/workflow'
import staticSchemaData from '../nodes_schema.json'

const SCHEMA = staticSchemaData as StaticSchema

const WIDGET_PRIMITIVE_TYPES = new Set(['INT', 'FLOAT', 'STRING', 'BOOLEAN'])

/**
 * Offline counterpart to fixes/schema.ts::fixNullWidgetValues.
 * Uses the static nodes_schema.json when no live objectInfo is available.
 *
 * Fixes:
 *   INT  null → 0        (Case 1: int(None) crash)
 *   FLOAT null → 0       (Case 2: float(None) crash)
 *   STRING null → ""     (Case 3: str(None) = "None" pollution)
 *   CAG COMBO null → "fixed"  (Case 6: frontend seed control undefined)
 *   COMBO null → not touched  (Case 5: no valid default known offline)
 */
export function fixNullWidgetValuesOffline(workflow: GraphWorkflow): number {
  let changes = 0

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

      if (inputType === 'INT' && cagInputs.has(inputName)) {
        // Fix INT null (Case 1)
        if (node.widgets_values[widgetIdx] === null || node.widgets_values[widgetIdx] === undefined) {
          node.widgets_values[widgetIdx] = 0
          changes++
        }
        widgetIdx++

        // Fix CAG COMBO null (Case 6) — "fixed" is the ComfyUI default mode
        if (widgetIdx < node.widgets_values.length) {
          if (node.widgets_values[widgetIdx] === null || node.widgets_values[widgetIdx] === undefined) {
            node.widgets_values[widgetIdx] = 'fixed'
            changes++
          }
          widgetIdx++
        }
        continue
      }

      const value = node.widgets_values[widgetIdx]

      if (value === null || value === undefined) {
        if (inputType === 'INT') {
          node.widgets_values[widgetIdx] = 0
          changes++
        } else if (inputType === 'FLOAT') {
          node.widgets_values[widgetIdx] = 0
          changes++
        } else if (inputType === 'STRING') {
          node.widgets_values[widgetIdx] = ''
          changes++
        }
        // COMBO null (Case 5): no known valid default offline — skip
      }

      widgetIdx++
    }
  }

  return changes
}
