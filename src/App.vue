<script setup lang="ts">
import UploadPanel from './components/UploadPanel.vue'
import WorkflowVisualizer from './components/WorkflowVisualizer.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import FixPanel from './components/FixPanel.vue'
import { ref } from 'vue'
import { usePanelSplit } from './composables/usePanelSplit'
import { useServerConnection } from './composables/useServerConnection'
import { useWorkflowFile } from './composables/useWorkflowFile'
import { useWorkflowAnalysis } from './composables/useWorkflowAnalysis'
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
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-950 overflow-hidden">

    <!-- Header -->
    <header class="flex-shrink-0 flex items-center justify-between px-5 h-11 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm z-20">
      <!-- Left: project name -->
      <span class="text-sm font-bold text-gray-100 tracking-tight font-mono">comfy_workflow_debuger</span>

      <!-- Center: nav links -->
      <nav class="flex items-center gap-5">
        <a
          href="https://kaili.space/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-gray-400 hover:text-gray-100 transition-colors duration-150"
        >Kaili</a>
        <a
          href="https://letscomfy.netlify.app/guides/basic/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-gray-400 hover:text-gray-100 transition-colors duration-150"
        >Let's ComfyUI</a>
      </nav>

      <!-- Right: GitHub -->
      <a
        href="https://github.com/kaili-yang/ComfyUI-Workflow-Debugger"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-100 transition-colors duration-150"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        GitHub
      </a>
    </header>

    <!-- Main content -->
    <div class="flex flex-row flex-1 min-h-0 overflow-hidden">
    <!-- Left column: upload -->
    <div class="w-80 flex-shrink-0 border-r border-gray-800 overflow-hidden">
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
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <div class="min-h-0 overflow-hidden" :style="{ height: topHeightPct + '%' }">
        <WorkflowVisualizer
          :workflow="workflow"
          :result="result"
          :selected-node-id="selectedNodeId"
          :fixed-node-ids="fixedNodeIds"
          :fixed-link-ids="fixedLinkIds"
          @node-select="selectNode"
        />
      </div>
      <div
        class="flex-shrink-0 h-1.5 bg-gray-800 hover:bg-blue-600/50 cursor-row-resize transition-colors duration-150 group relative"
        @mousedown.prevent="onDividerMousedown"
      >
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gray-700 group-hover:bg-blue-500/60 transition-colors" />
      </div>
      <div class="min-h-0 overflow-hidden" :style="{ height: (100 - topHeightPct) + '%' }">
        <DiagnosticsPanel
          :result="result"
          :selected-node-id="selectedNodeId"
          @node-select="selectNode"
          @fix="onFixIssue"
        />
      </div>
    </div>

    <!-- Right column: fix + export -->
    <div class="w-80 flex-shrink-0 border-l border-gray-800 overflow-hidden">
      <FixPanel
        :result="result"
        :raw-content="rawContent"
        :file-name="fileName"
        :object-info="objectInfo ?? undefined"
        @apply="onFixed"
      />
    </div>
    </div><!-- end main content -->
  </div>
</template>
