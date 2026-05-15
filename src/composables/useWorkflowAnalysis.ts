import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { AnalysisResult, GraphWorkflow, ObjectInfo } from '../types/workflow'
import { analyzeWorkflow } from '../lib/analyzer'
import { apiToGraphWorkflow } from '../lib/shared/api-to-graph'

export function useWorkflowAnalysis(
  rawContent: Ref<string | null>,
  objectInfo: Ref<ObjectInfo | null>,
) {
  const result = ref<AnalysisResult | null>(null)
  const workflow = ref<GraphWorkflow | null>(null)
  const selectedNodeId = ref<number | null>(null)

  function runAnalysis(content: string): void {
    result.value = analyzeWorkflow(content, objectInfo.value ?? undefined)
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
        workflow.value = parsed as GraphWorkflow
      } else {
        const keys = Object.keys(parsed)
        const isApi =
          keys.length > 0 &&
          keys.every((k) => /^\d+$/.test(k) && typeof parsed[k] === 'object' && 'class_type' in parsed[k])
        workflow.value = isApi ? apiToGraphWorkflow(parsed) : null
      }
    } catch {
      workflow.value = null
    }
  }

  watch([rawContent, objectInfo], ([content]) => {
    if (!content) {
      result.value = null
      workflow.value = null
      selectedNodeId.value = null
      return
    }
    runAnalysis(content)
  })

  function selectNode(id: number | null): void {
    selectedNodeId.value = id
  }

  return { result, workflow, selectedNodeId, selectNode }
}
