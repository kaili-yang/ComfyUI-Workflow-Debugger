// LGraphEventMode — matches ComfyUI_frontend/src/lib/litegraph/src/types/globalEnums.ts
export type NodeMode = 0 | 1 | 2 | 3 | 4 // ALWAYS | ON_EVENT | NEVER | ON_TRIGGER | BYPASS

// ISlotType — matches ComfyUI_frontend/src/lib/litegraph/src/interfaces.ts
// String for named types ("IMAGE", "LATENT", …); number for legacy primitive types
export type SlotType = string | number

export interface WorkflowLink {
  id: number
  fromNodeId: number
  fromSlot: number
  toNodeId: number
  toSlot: number
  type: SlotType
}

export interface NodeInputSlot {
  name: string
  type: SlotType
  link: number | null
  slot_index?: number
  widget?: { name: string }
}

export interface NodeOutputSlot {
  name: string
  type: SlotType
  links: number[] | null // null when no connections, per LiteGraph serialization
  slot_index?: number
  widget?: { name: string }
}

export interface WorkflowNode {
  id: number
  type: string
  pos?: [number, number]      // optional only because broken workflows may omit it
  size?: [number, number]     // same — always a tuple when present
  mode?: NodeMode
  inputs?: NodeInputSlot[]
  outputs?: NodeOutputSlot[]
  widgets_values?: unknown[]
  flags?: Record<string, unknown>
  properties?: Record<string, unknown>
  title?: string
  order?: number
}

export interface GraphWorkflow {
  nodes: WorkflowNode[]
  // Link tuple: [id, fromNodeId, fromSlot, toNodeId, toSlot, type]
  links: [number, number, number, number, number, SlotType][]
  version?: number
  last_node_id?: number
  last_link_id?: number
}

export type Severity = 'error' | 'warning' | 'info'

export interface Issue {
  severity: Severity
  nodeId?: number
  nodeType?: string
  message: string
  detail?: string
  suggestion?: string
  fixable?: boolean
}

export interface AnalysisResult {
  format: 'graph' | 'api' | 'unknown'
  nodeCount: number
  linkCount: number
  issues: Issue[]
  canRun: boolean
}

// ---------------------------------------------------------------------------
// /object_info schema types
// ---------------------------------------------------------------------------

export interface NodeInputConfig {
  default?: unknown
  min?: number
  max?: number
  step?: number
  multiline?: boolean
  [key: string]: unknown
}

export interface NodeSchemaDef {
  input: {
    required?: Record<string, [string | string[], NodeInputConfig?]>
    optional?: Record<string, [string | string[], NodeInputConfig?]>
  }
  output: string[]
  output_name?: string[]
  category: string
  output_node?: boolean
}

export type ObjectInfo = Record<string, NodeSchemaDef>
