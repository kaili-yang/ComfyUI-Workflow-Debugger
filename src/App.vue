<script setup lang="ts">
import { ref } from 'vue'
import UploadPanel from './components/UploadPanel.vue'
import WorkflowVisualizer from './components/WorkflowVisualizer.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import { analyzeWorkflow } from './lib/analyzer'
import type { AnalysisResult, GraphWorkflow } from './types/workflow'

const fileName = ref<string | null>(null)
const result = ref<AnalysisResult | null>(null)
const workflow = ref<GraphWorkflow | null>(null)

function onFileLoaded(name: string, content: string): void {
  fileName.value = name
  result.value = analyzeWorkflow(content)
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
      workflow.value = parsed as GraphWorkflow
    } else {
      workflow.value = null
    }
  } catch {
    workflow.value = null
  }
}

function reset(): void {
  fileName.value = null
  result.value = null
  workflow.value = null
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-950 overflow-hidden">
    <!-- Top row: upload (left) + canvas (right) -->
    <div class="flex min-h-0 h-[60%]">
      <div class="w-72 flex-shrink-0 border-r border-gray-800 overflow-hidden">
        <UploadPanel
          :file-name="fileName"
          @file-loaded="onFileLoaded"
          @reset="reset"
        />
      </div>
      <div class="flex-1 min-w-0 overflow-hidden">
        <WorkflowVisualizer :workflow="workflow" :result="result" />
      </div>
    </div>
    <!-- Bottom row: diagnostics -->
    <div class="h-[40%] min-h-0 border-t border-gray-800 overflow-hidden">
      <DiagnosticsPanel :result="result" />
    </div>
  </div>
</template>
