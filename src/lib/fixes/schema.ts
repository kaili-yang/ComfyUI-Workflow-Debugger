import type { GraphWorkflow, NodeInputConfig, ObjectInfo } from '../../types/workflow'

const WIDGET_PRIMITIVE_TYPES = new Set(['INT', 'FLOAT', 'STRING', 'BOOLEAN'])

// Replaces null/undefined values in widgets_values for INT and FLOAT inputs.
// Uses objectInfo to map each widgets_values position to its input type, mirroring
// the same traversal used in checks/schema.ts checkWidgetValues.
export function fixNullWidgetValues(workflow: GraphWorkflow, objectInfo: ObjectInfo): number {
  let changes = 0

  for (const node of workflow.nodes) {
    const schemaDef = objectInfo[node.type]
    if (!schemaDef || !node.widgets_values?.length) continue

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
      if (widgetIdx >= node.widgets_values.length) break
      const [inputType, config] = inputDef
      const isCombo = Array.isArray(inputType)
      const isPrimitive = !isCombo && WIDGET_PRIMITIVE_TYPES.has(inputType as string)
      if (!isCombo && !isPrimitive) continue
      if (connectedInputs.has(inputName)) continue

      const value = node.widgets_values[widgetIdx]

      if ((inputType === 'INT' || inputType === 'FLOAT') && (value === null || value === undefined)) {
        const cfg = (config ?? {}) as NodeInputConfig
        node.widgets_values[widgetIdx] = typeof cfg.default === 'number' ? cfg.default : 0
        changes++
      }

      widgetIdx++
    }
  }

  return changes
}
