import type { AnalysisResult, GraphWorkflow, ObjectInfo } from '../types/workflow'
import { buildContext } from './shared/graph-context'
import { checkLinkIntegrity, checkLinkTypeMetadata } from './checks/link'
import { checkTypeMismatch } from './checks/type-mismatch'
import { checkMutedWithDependents, checkOrphans } from './checks/node-state'
import { checkNoOutputNode, checkCycles } from './checks/topology'
import { checkSchema } from './checks/schema'
import { checkMediaRefs } from './checks/media'
import { checkApiFormat } from './checks/api-format'
import { checkDisconnectedInputs } from './checks/others/disconnected-inputs'
import { checkNullWidgetValues } from './checks/others/null-widget-values'

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

function isGraphFormat(parsed: unknown): parsed is GraphWorkflow {
  if (typeof parsed !== 'object' || parsed === null) return false
  const obj = parsed as Record<string, unknown>
  return Array.isArray(obj['nodes']) && Array.isArray(obj['links'])
}

interface ApiNode {
  class_type: string
  inputs: Record<string, unknown>
}

function isApiFormat(parsed: unknown): parsed is Record<string, ApiNode> {
  if (typeof parsed !== 'object' || parsed === null) return false
  const obj = parsed as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return false
  return keys.every((k) => {
    if (!/^\d+$/.test(k)) return false
    const v = obj[k]
    return typeof v === 'object' && v !== null && 'class_type' in v
  })
}

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

function analyzeGraph(workflow: GraphWorkflow, objectInfo?: ObjectInfo): AnalysisResult {
  const ctx = buildContext(workflow, objectInfo)
  const issues = [
    ...checkLinkIntegrity(ctx),
    ...checkLinkTypeMetadata(ctx),
    ...checkTypeMismatch(ctx),
    ...checkDisconnectedInputs(ctx),
    ...checkNullWidgetValues(ctx),
    ...checkMutedWithDependents(ctx),
    ...checkNoOutputNode(ctx),
    ...checkCycles(ctx),
    ...checkOrphans(ctx),
    ...checkMediaRefs(ctx),
    ...checkSchema(ctx),
  ]
  return {
    format: 'graph',
    nodeCount: workflow.nodes.length,
    linkCount: workflow.links.length,
    issues,
    canRun: issues.filter((i) => i.severity === 'error').length === 0,
  }
}

function analyzeApi(parsed: Record<string, ApiNode>, objectInfo?: ObjectInfo): AnalysisResult {
  const issues = checkApiFormat(parsed, objectInfo)
  return {
    format: 'api',
    nodeCount: Object.keys(parsed).length,
    linkCount: 0,
    issues,
    canRun: issues.filter((i) => i.severity === 'error').length === 0,
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function analyzeWorkflow(jsonText: string, objectInfo?: ObjectInfo): AnalysisResult {
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

  if (isGraphFormat(parsed)) return analyzeGraph(parsed, objectInfo)
  if (isApiFormat(parsed)) return analyzeApi(parsed, objectInfo)

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
        suggestion:
          'Export the workflow from ComfyUI using Save (graph format) or Save (API format)',
      },
    ],
    canRun: false,
  }
}
