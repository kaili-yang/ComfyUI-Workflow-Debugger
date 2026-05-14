import type {
  AnalysisResult,
  GraphWorkflow,
  Issue,
  WorkflowLink,
  WorkflowNode,
} from '../types/workflow'

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

function isGraphFormat(parsed: unknown): parsed is GraphWorkflow {
  if (typeof parsed !== 'object' || parsed === null) return false
  const obj = parsed as Record<string, unknown>
  return Array.isArray(obj['nodes']) && Array.isArray(obj['links'])
}

function isApiFormat(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false
  const obj = parsed as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return false
  // All keys must be numeric strings and all values must have class_type
  return keys.every((k) => {
    if (!/^\d+$/.test(k)) return false
    const v = obj[k]
    return typeof v === 'object' && v !== null && 'class_type' in v
  })
}

// ---------------------------------------------------------------------------
// Graph format analysis
// ---------------------------------------------------------------------------

const OUTPUT_NODE_TYPES = new Set([
  'SaveImage',
  'PreviewImage',
  'SaveAnimatedWEBP',
  'SaveAnimatedPNG',
  'VHS_VideoCombine',
  'DisplayText',
  'ShowText|pysssss',
])

function modeLabel(mode: number): string {
  const labels: Record<number, string> = { 0: 'active', 1: 'on-event', 2: 'muted', 3: 'on-trigger', 4: 'bypassed' }
  return labels[mode] ?? `mode-${mode}`
}

function analyzeGraph(workflow: GraphWorkflow): Issue[] {
  const issues: Issue[] = []

  // Build node map
  const nodeMap = new Map<number, WorkflowNode>()
  for (const node of workflow.nodes) {
    nodeMap.set(node.id, node)
  }

  // Build link map
  const linkMap = new Map<number, WorkflowLink>()
  for (const raw of workflow.links) {
    const [id, fromNodeId, fromSlot, toNodeId, toSlot, type] = raw
    linkMap.set(id, { id, fromNodeId, fromSlot, toNodeId, toSlot, type })
  }

  // -------------------------------------------------------------------
  // Check 1: Link integrity
  // -------------------------------------------------------------------

  // Inputs referencing missing link IDs
  for (const node of workflow.nodes) {
    if (!node.inputs) continue
    for (const input of node.inputs) {
      if (input.link !== null && input.link !== undefined) {
        if (!linkMap.has(input.link)) {
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) input '${input.name}' references missing link #${input.link}`,
            suggestion: `Remove or reconnect node ${node.type} (id: ${node.id}) - link #${input.link} is missing`,
          })
        }
      }
    }
  }

  // Outputs referencing missing link IDs
  for (const node of workflow.nodes) {
    if (!node.outputs) continue
    for (const output of node.outputs) {
      for (const linkId of output.links ?? []) {
        if (!linkMap.has(linkId)) {
          issues.push({
            severity: 'error',
            nodeId: node.id,
            nodeType: node.type,
            message: `Node ${node.type} (id: ${node.id}) output '${output.name}' references missing link #${linkId}`,
            suggestion: `Remove or reconnect node ${node.type} (id: ${node.id}) - link #${linkId} is missing`,
          })
        }
      }
    }
  }

  // Links referencing missing node IDs
  for (const link of linkMap.values()) {
    if (!nodeMap.has(link.fromNodeId)) {
      issues.push({
        severity: 'error',
        message: `Link #${link.id} references non-existent source node id: ${link.fromNodeId}`,
        suggestion: `Remove link #${link.id} - source node ${link.fromNodeId} does not exist`,
      })
    }
    if (!nodeMap.has(link.toNodeId)) {
      issues.push({
        severity: 'error',
        message: `Link #${link.id} references non-existent target node id: ${link.toNodeId}`,
        suggestion: `Remove link #${link.id} - target node ${link.toNodeId} does not exist`,
      })
    }
  }

  // -------------------------------------------------------------------
  // Check 2: Type consistency
  // -------------------------------------------------------------------

  for (const link of linkMap.values()) {
    const fromNode = nodeMap.get(link.fromNodeId)
    const toNode = nodeMap.get(link.toNodeId)

    // Skip if nodes are missing (already caught above)
    if (!fromNode || !toNode) continue

    const sourceOutput = fromNode.outputs?.[link.fromSlot]
    const targetInput = toNode.inputs?.[link.toSlot]

    if (sourceOutput && sourceOutput.type !== link.type) {
      issues.push({
        severity: 'warning',
        nodeId: fromNode.id,
        nodeType: fromNode.type,
        message: `Link #${link.id}: source output type '${sourceOutput.type}' disagrees with link type '${link.type}'`,
        detail: `Node ${fromNode.type} (id: ${fromNode.id}) slot ${link.fromSlot} → ${toNode.type} (id: ${toNode.id})`,
      })
    }

    if (sourceOutput && targetInput && sourceOutput.type !== targetInput.type) {
      // Wildcard / any-type passthrough — skip if either side is '*'
      if (sourceOutput.type !== '*' && targetInput.type !== '*') {
        issues.push({
          severity: 'error',
          nodeId: toNode.id,
          nodeType: toNode.type,
          message: `Type mismatch on link #${link.id}: '${sourceOutput.type}' connected to '${targetInput.type}'`,
          detail: `From ${fromNode.type} (id: ${fromNode.id}) output '${sourceOutput.name}' → ${toNode.type} (id: ${toNode.id}) input '${targetInput.name}'`,
          suggestion: `Disconnect link #${link.id} and reconnect a matching ${targetInput.type} output to ${toNode.type} (id: ${toNode.id}) input '${targetInput.name}'`,
        })
      }
    }
  }

  // -------------------------------------------------------------------
  // Check 3: Disconnected input slots
  // -------------------------------------------------------------------

  for (const node of workflow.nodes) {
    if (!node.inputs) continue
    for (const input of node.inputs) {
      if (input.link === null || input.link === undefined) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          nodeType: node.type,
          message: `Node ${node.type} (id: ${node.id}) input '${input.name}' (type: ${input.type}) is not connected`,
          suggestion: `Connect a ${input.type} output to this input, or verify this node works without it`,
        })
      }
    }
  }

  // -------------------------------------------------------------------
  // Check 4: Muted/bypassed nodes with downstream dependents
  // -------------------------------------------------------------------

  for (const link of linkMap.values()) {
    const fromNode = nodeMap.get(link.fromNodeId)
    const toNode = nodeMap.get(link.toNodeId)
    if (!fromNode || !toNode) continue

    const mode = fromNode.mode ?? 0
    if (mode !== 0) {
      issues.push({
        severity: 'error',
        nodeId: fromNode.id,
        nodeType: fromNode.type,
        message: `Node ${fromNode.type} (id: ${fromNode.id}) is ${modeLabel(mode)} but node ${toNode.type} (id: ${toNode.id}) depends on its output`,
        detail: `Link #${link.id} carries type '${link.type}' from ${modeLabel(mode)} node`,
        suggestion: `Either unmute/unbypass node ${fromNode.type} (id: ${fromNode.id}), or disconnect its outputs`,
      })
    }
  }

  // -------------------------------------------------------------------
  // Check 5: No output nodes
  // -------------------------------------------------------------------

  const hasOutputNode = workflow.nodes.some((n) => OUTPUT_NODE_TYPES.has(n.type))
  if (!hasOutputNode) {
    issues.push({
      severity: 'warning',
      message: 'No output node found (SaveImage, PreviewImage, etc.) - workflow produces no visible result',
      suggestion: 'Add a SaveImage or PreviewImage node and connect an IMAGE output to it',
    })
  }

  // -------------------------------------------------------------------
  // Check 6: Cycle detection
  // -------------------------------------------------------------------

  // Build adjacency list
  const adj = new Map<number, number[]>()
  for (const node of workflow.nodes) {
    adj.set(node.id, [])
  }
  for (const link of linkMap.values()) {
    if (nodeMap.has(link.fromNodeId) && nodeMap.has(link.toNodeId)) {
      adj.get(link.fromNodeId)!.push(link.toNodeId)
    }
  }

  // DFS cycle detection: 0=white, 1=gray, 2=black
  const color = new Map<number, 0 | 1 | 2>()
  const parent = new Map<number, number | null>()
  let cycleFound = false
  let cyclePath: number[] = []

  for (const node of workflow.nodes) {
    color.set(node.id, 0)
    parent.set(node.id, null)
  }

  function dfs(nodeId: number, stack: number[]): void {
    if (cycleFound) return
    color.set(nodeId, 1)
    stack.push(nodeId)

    for (const neighbor of adj.get(nodeId) ?? []) {
      if (cycleFound) return
      const c = color.get(neighbor) ?? 0
      if (c === 1) {
        // Found a cycle — extract the cycle from the stack
        const idx = stack.indexOf(neighbor)
        cyclePath = stack.slice(idx)
        cycleFound = true
        return
      }
      if (c === 0) {
        parent.set(neighbor, nodeId)
        dfs(neighbor, stack)
      }
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
    issues.push({
      severity: 'error',
      message: `Circular dependency detected: ${pathStr} → ${(() => { const n = nodeMap.get(cyclePath[0]); return n ? `${n.type}(${cyclePath[0]})` : `?(${cyclePath[0]})` })()}`,
      suggestion: 'Remove one of the connections that forms the cycle',
    })
  }

  // -------------------------------------------------------------------
  // Check 7: Orphan nodes (info)
  // -------------------------------------------------------------------

  for (const node of workflow.nodes) {
    const hasInputConnections =
      node.inputs?.some((i) => i.link !== null && i.link !== undefined) ?? false
    const hasOutputConnections =
      node.outputs?.some((o) => o.links && o.links.length > 0) ?? false

    // A node with no inputs defined and no outputs defined is also orphaned
    const hasInputSlots = (node.inputs?.length ?? 0) > 0
    const hasOutputSlots = (node.outputs?.length ?? 0) > 0

    if (!hasInputConnections && !hasOutputConnections && (hasInputSlots || hasOutputSlots)) {
      issues.push({
        severity: 'info',
        nodeId: node.id,
        nodeType: node.type,
        message: `Node ${node.type} (id: ${node.id}) has no connections - it won't affect the workflow`,
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// API format analysis
// ---------------------------------------------------------------------------

interface ApiNode {
  class_type: string
  // Values are either raw (string/number/boolean) or node-references [nodeId, slotIndex]
  inputs: Record<string, unknown>
  _meta?: Record<string, unknown>
}

function analyzeApi(parsed: Record<string, ApiNode>): Issue[] {
  const issues: Issue[] = []
  const nodeIds = new Set(Object.keys(parsed))

  for (const [nodeId, node] of Object.entries(parsed)) {
    for (const [inputName, value] of Object.entries(node.inputs)) {
      // Node references look like ["nodeId", slotIndex]
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

  // Cycle detection for API format
  const adj = new Map<string, string[]>()
  for (const id of nodeIds) {
    adj.set(id, [])
  }
  for (const [nodeId, node] of Object.entries(parsed)) {
    for (const value of Object.values(node.inputs)) {
      if (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'string' &&
        typeof value[1] === 'number'
      ) {
        const refId = value[0] as string
        if (nodeIds.has(refId)) {
          adj.get(refId)!.push(nodeId)
        }
      }
    }
  }

  const color = new Map<string, 0 | 1 | 2>()
  for (const id of nodeIds) color.set(id, 0)

  let cycleFound = false
  let cyclePath: string[] = []

  function dfsApi(nodeId: string, stack: string[]): void {
    if (cycleFound) return
    color.set(nodeId, 1)
    stack.push(nodeId)
    for (const neighbor of adj.get(nodeId) ?? []) {
      if (cycleFound) return
      const c = color.get(neighbor) ?? 0
      if (c === 1) {
        const idx = stack.indexOf(neighbor)
        cyclePath = stack.slice(idx)
        cycleFound = true
        return
      }
      if (c === 0) dfsApi(neighbor, stack)
    }
    stack.pop()
    color.set(nodeId, 2)
  }

  for (const id of nodeIds) {
    if ((color.get(id) ?? 0) === 0) {
      dfsApi(id, [])
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

  // No output node check for API format
  const hasOutputNode = Object.values(parsed).some((n) =>
    OUTPUT_NODE_TYPES.has(n.class_type),
  )
  if (!hasOutputNode) {
    issues.push({
      severity: 'warning',
      message: 'No output node found (SaveImage, PreviewImage, etc.) - workflow produces no visible result',
      suggestion: 'Add a SaveImage or PreviewImage node and connect an IMAGE output to it',
    })
  }

  return issues
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function analyzeWorkflow(jsonText: string): AnalysisResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return {
      format: 'unknown',
      nodeCount: 0,
      linkCount: 0,
      issues: [
        {
          severity: 'error',
          message: 'Invalid JSON: could not parse the file',
          suggestion: 'Make sure the file is valid JSON',
        },
      ],
      canRun: false,
    }
  }

  if (isGraphFormat(parsed)) {
    const issues = analyzeGraph(parsed)
    return {
      format: 'graph',
      nodeCount: parsed.nodes.length,
      linkCount: parsed.links.length,
      issues,
      canRun: issues.filter((i) => i.severity === 'error').length === 0,
    }
  }

  if (isApiFormat(parsed)) {
    const apiWorkflow = parsed as Record<string, ApiNode>
    const issues = analyzeApi(apiWorkflow)
    return {
      format: 'api',
      nodeCount: Object.keys(apiWorkflow).length,
      linkCount: 0,
      issues,
      canRun: issues.filter((i) => i.severity === 'error').length === 0,
    }
  }

  return {
    format: 'unknown',
    nodeCount: 0,
    linkCount: 0,
    issues: [
      {
        severity: 'error',
        message: 'Unrecognized workflow format',
        detail:
          'Expected either a graph format (with "nodes" and "links" arrays) or an API/prompt format (with numeric string keys and "class_type" values)',
        suggestion: 'Export the workflow from ComfyUI using Save (graph format) or Save (API format)',
      },
    ],
    canRun: false,
  }
}
