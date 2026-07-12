<script setup lang="ts">
import UploadPanel from './components/UploadPanel.vue'
import WorkflowVisualizer from './components/WorkflowVisualizer.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import FixPanel from './components/FixPanel.vue'
import { onMounted, ref } from 'vue'
import { usePanelSplit } from './composables/usePanelSplit'
import { useServerConnection } from './composables/useServerConnection'
import { useWorkflowFile } from './composables/useWorkflowFile'
import { useWorkflowAnalysis } from './composables/useWorkflowAnalysis'
import { startProductTour } from './composables/useDriverTour'
import { fixByType } from './lib/fixer'
import type { FixType } from './types/workflow'

const { topHeightPct, onDividerMousedown } = usePanelSplit('cwd-panel-split')
const { objectInfo, schemaStatus, cachedAt, connect, disconnect } = useServerConnection()
const { fileName, rawContent, onFileLoaded, reset } = useWorkflowFile()
const { result, workflow, selectedNodeId, selectNode } = useWorkflowAnalysis(rawContent, objectInfo)

const fixedNodeIds = ref<Set<number>>(new Set())
const fixedLinkIds = ref<Set<number>>(new Set())

function clearFixHighlights(): void {
  fixedNodeIds.value = new Set()
  fixedLinkIds.value = new Set()
}

function onFileLoadedAndClear(...args: Parameters<typeof onFileLoaded>): void {
  clearFixHighlights()
  onFileLoaded(...args)
}

function onResetAndClear(): void {
  clearFixHighlights()
  reset()
}

function onFixed(fixedJson: string, newNodeIds: number[], newLinkIds: number[]): void {
  fixedNodeIds.value = new Set(newNodeIds)
  fixedLinkIds.value = new Set(newLinkIds)
  rawContent.value = fixedJson
}

function onFixIssue(fixType: FixType): void {
  if (!rawContent.value) return
  const r = fixByType(rawContent.value, fixType, objectInfo.value ?? undefined)
  if (r.changes > 0) {
    fixedNodeIds.value = new Set(r.newNodeIds)
    fixedLinkIds.value = new Set(r.newLinkIds)
    rawContent.value = r.fixed
  }
}

onMounted(() => {
  // Slight delay so panel layout is painted before Driver.js measures targets
  window.setTimeout(() => startProductTour({ force: true }), 450)
})
</script>

<template>
  <div class="flex flex-col h-screen bg-ink-900 overflow-hidden font-sans">
 
      <!-- Header -->
      <header class="flex-shrink-0 flex items-center justify-between px-6 h-14 border-b border-ink-800 bg-ink-900/80 backdrop-blur-md z-20">
        <!-- Left: project name with beautiful styling -->
        <div class="flex items-center gap-2">
          <div class="w-3.5 h-3.5 rounded bg-brand-yellow shadow-[0_0_10px_rgba(240,255,65,0.4)] rotate-12"></div>
          <h1 class="text-lg font-extrabold tracking-tight font-display text-brand-yellow">
            ComfyUI Workflow Debugger
          </h1>
        </div>

        <!-- Right: GitHub -->
        <a
          href="https://github.com/kaili-yang/ComfyUI-Workflow-Debugger"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2.5 text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition-colors duration-150 px-4 py-2 rounded-xl border border-ink-800 bg-ink-800/30 hover:bg-ink-800/80 shadow-sm"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          GitHub
        </a>
     </header>
 
     <!-- Main content -->
     <div class="flex flex-row flex-1 min-h-0 overflow-hidden bg-ink-900">
     <!-- Left column: upload -->
     <div class="w-80 flex-shrink-0 border-r border-ink-800 overflow-hidden bg-ink-900/40">
       <UploadPanel
         :file-name="fileName"
         :schema-status="schemaStatus"
         :schema-node-count="objectInfo ? Object.keys(objectInfo).length : 0"
         :cached-at="cachedAt"
         @file-loaded="onFileLoadedAndClear"
         @reset="onResetAndClear"
         @connect="connect"
         @disconnect="disconnect"
       />
     </div>
 
     <!-- Center column: canvas (top) + drag handle + diagnostics (bottom) -->
     <div class="flex flex-col flex-1 min-w-0 overflow-hidden bg-ink-900">
       <div id="tour-step-2" class="min-h-0 overflow-hidden" :style="{ height: topHeightPct + '%' }">
         <WorkflowVisualizer
           :workflow="workflow"
           :result="result"
           :file-name="fileName"
           :selected-node-id="selectedNodeId"
           :fixed-node-ids="fixedNodeIds"
           :fixed-link-ids="fixedLinkIds"
           @node-select="selectNode"
         />
       </div>
       <div
         class="flex-shrink-0 h-1.5 bg-ink-800 hover:bg-brand-yellow/30 cursor-row-resize transition-colors duration-150 group relative"
         @mousedown.prevent="onDividerMousedown"
       >
         <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-ink-700 group-hover:bg-brand-yellow/40 transition-colors" />
       </div>
       <div id="tour-step-3" class="min-h-0 overflow-hidden" :style="{ height: (100 - topHeightPct) + '%' }">
         <DiagnosticsPanel
           :result="result"
           :selected-node-id="selectedNodeId"
           @node-select="selectNode"
           @fix="onFixIssue"
         />
       </div>
     </div>
  
     <!-- Right column: fix + export -->
     <div class="w-80 flex-shrink-0 border-l border-ink-800 overflow-hidden bg-ink-900/40">
       <FixPanel
         :result="result"
         :raw-content="rawContent"
         :file-name="fileName"
         :object-info="objectInfo ?? undefined"
         :top-height-pct="topHeightPct"
         @apply="onFixed"
       />
     </div>
     </div><!-- end main content -->
   </div>
</template>
