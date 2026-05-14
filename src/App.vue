<script setup lang="ts">
import { ref } from 'vue'
import UploadPanel from './components/UploadPanel.vue'
import WorkflowVisualizer from './components/WorkflowVisualizer.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import { analyzeWorkflow } from './lib/analyzer'
import type { AnalysisResult, GraphWorkflow, ObjectInfo } from './types/workflow'

const fileName = ref<string | null>(null)
const rawContent = ref<string | null>(null)
const result = ref<AnalysisResult | null>(null)
const workflow = ref<GraphWorkflow | null>(null)

const objectInfo = ref<ObjectInfo | null>(null)
const schemaStatus = ref<'idle' | 'loading' | 'connected' | 'error'>('idle')

function runAnalysis(content: string): void {
  result.value = analyzeWorkflow(content, objectInfo.value ?? undefined)
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

function onFileLoaded(name: string, content: string): void {
  fileName.value = name
  rawContent.value = content
  runAnalysis(content)
}

async function connectToServer(url: string): Promise<void> {
  schemaStatus.value = 'loading'
  try {
    const base = url.replace(/\/$/, '')
    const res = await fetch(`${base}/object_info`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    objectInfo.value = await res.json()
    schemaStatus.value = 'connected'
    if (rawContent.value) runAnalysis(rawContent.value)
  } catch {
    schemaStatus.value = 'error'
    objectInfo.value = null
  }
}

function disconnect(): void {
  objectInfo.value = null
  schemaStatus.value = 'idle'
  if (rawContent.value) runAnalysis(rawContent.value)
}

function reset(): void {
  fileName.value = null
  rawContent.value = null
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
          :schema-status="schemaStatus"
          :schema-node-count="objectInfo ? Object.keys(objectInfo).length : 0"
          @file-loaded="onFileLoaded"
          @reset="reset"
          @connect="connectToServer"
          @disconnect="disconnect"
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
