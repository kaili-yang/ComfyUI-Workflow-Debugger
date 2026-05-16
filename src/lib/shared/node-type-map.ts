import mapJson from './node-type-map.json'

export interface ConversionNode {
  class: string
  inputSlot: string
  outputSlot: number
  extraInputs: { name: string; type: string; slotIndex: number }[]
}

export interface SourceNode {
  class: string
  outputSlot: number
  widgetDefaults: Record<string, unknown>
  requiredInputs?: { name: string; type: string; slotIndex: number }[]
}

export interface NodeTypeMap {
  conversionMap: Record<string, Record<string, ConversionNode[]>>
  sourceMap: Record<string, SourceNode[]>
}

export const nodeTypeMap: NodeTypeMap = mapJson as NodeTypeMap
