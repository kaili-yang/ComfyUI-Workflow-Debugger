<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import UploadPanel from './components/UploadPanel.vue'
import WorkflowVisualizer from './components/WorkflowVisualizer.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import FixPanel from './components/FixPanel.vue'
import { analyzeWorkflow } from './lib/analyzer'
import type { AnalysisResult, GraphWorkflow, ObjectInfo } from './types/workflow'

const fileName = ref<string | null>(null)
const rawContent = ref<string | null>(null)
const result = ref<AnalysisResult | null>(null)
const workflow = ref<GraphWorkflow | null>(null)
const selectedNodeId = ref<number | null>(null)

const objectInfo = ref<ObjectInfo | null>(null)
const schemaStatus = ref<'idle' | 'loading' | 'connected' | 'error'>('idle')

const STORAGE_KEY = 'cwd-panel-split'
const topHeightPct = ref(Number(localStorage.getItem(STORAGE_KEY)) || 60)
let isDragging = false
let dragStartY = 0
let dragStartPct = 0

function onDividerMousedown(e: MouseEvent): void {
  isDragging = true
  dragStartY = e.clientY
  dragStartPct = topHeightPct.value
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

function onDocMousemove(e: MouseEvent): void {
  if (!isDragging) return
  const containerH = document.documentElement.clientHeight
  const deltaY = e.clientY - dragStartY
  const deltaPct = (deltaY / containerH) * 100
  topHeightPct.value = Math.min(85, Math.max(15, dragStartPct + deltaPct))
}

function onDocMouseup(): void {
  if (!isDragging) return
  isDragging = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  localStorage.setItem(STORAGE_KEY, String(Math.round(topHeightPct.value)))
}

onMounted(() => {
  document.addEventListener('mousemove', onDocMousemove)
  document.addEventListener('mouseup', onDocMouseup)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDocMousemove)
  document.removeEventListener('mouseup', onDocMouseup)
})

function apiToGraphWorkflow(parsed: Record<string, { class_type: string; inputs: Record<string, unknown> }>): GraphWorkflow {
  const nodeIds = Object.keys(parsed)
  const nodes: GraphWorkflow['nodes'] = nodeIds.map((id) => ({
    id: Number(id),
    type: parsed[id].class_type,
  }))
  const links: GraphWorkflow['links'] = []
  let linkId = 1
  for (const [toId, node] of Object.entries(parsed)) {
    let toSlot = 0
    for (const value of Object.values(node.inputs)) {
      if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'number') {
        links.push([linkId++, Number(value[0]), value[1], Number(toId), toSlot, 'LINK'])
      }
      toSlot++
    }
  }
  return { nodes, links }
}

function runAnalysis(content: string): void {
  result.value = analyzeWorkflow(content, objectInfo.value ?? undefined)
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
      workflow.value = parsed as GraphWorkflow
    } else {
      // API format — convert to a minimal GraphWorkflow for visualization
      const keys = Object.keys(parsed)
      const isApi = keys.length > 0 && keys.every((k) => /^\d+$/.test(k) && typeof parsed[k] === 'object' && 'class_type' in parsed[k])
      workflow.value = isApi ? apiToGraphWorkflow(parsed) : null
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

function selectNode(id: number | null): void {
  selectedNodeId.value = id
}

function onFixed(fixedJson: string): void {
  rawContent.value = fixedJson
  runAnalysis(fixedJson)
}

function reset(): void {
  fileName.value = null
  rawContent.value = null
  result.value = null
  workflow.value = null
  selectedNodeId.value = null
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-950 overflow-hidden">
    <!-- Top row: upload (left) + canvas (right) -->
    <div class="flex min-h-0 overflow-hidden" :style="{ height: topHeightPct + '%' }">
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
        <WorkflowVisualizer
          :workflow="workflow"
          :result="result"
          :selected-node-id="selectedNodeId"
          @node-select="selectNode"
        />
      </div>
    </div>
    <!-- Drag handle -->
    <div
      class="flex-shrink-0 h-1.5 bg-gray-800 hover:bg-blue-600/50 cursor-row-resize transition-colors duration-150 group relative"
      @mousedown.prevent="onDividerMousedown"
    >
      <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gray-700 group-hover:bg-blue-500/60 transition-colors" />
    </div>
    <!-- Bottom row: fix panel (left) + diagnostics (right) -->
    <div class="flex min-h-0 overflow-hidden" :style="{ height: (100 - topHeightPct) + '%' }">
      <div class="w-72 flex-shrink-0 border-r border-gray-800 overflow-hidden">
        <FixPanel
          :result="result"
          :raw-content="rawContent"
          :file-name="fileName"
          @apply="onFixed"
        />
      </div>
      <div class="flex-1 min-w-0 overflow-hidden">
        <DiagnosticsPanel
          :result="result"
          :selected-node-id="selectedNodeId"
          @node-select="selectNode"
        />
      </div>
    </div>
  </div>
</template>
