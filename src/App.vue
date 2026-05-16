<script setup lang="ts">
import UploadPanel from './components/UploadPanel.vue'
import WorkflowVisualizer from './components/WorkflowVisualizer.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import FixPanel from './components/FixPanel.vue'
import { usePanelSplit } from './composables/usePanelSplit'
import { useServerConnection } from './composables/useServerConnection'
import { useWorkflowFile } from './composables/useWorkflowFile'
import { useWorkflowAnalysis } from './composables/useWorkflowAnalysis'
import { fixByType } from './lib/fixer'
import type { FixType } from './types/workflow'

const { topHeightPct, onDividerMousedown } = usePanelSplit('cwd-panel-split')
const { objectInfo, schemaStatus, connect, disconnect } = useServerConnection()
const { fileName, rawContent, onFileLoaded, reset } = useWorkflowFile()
const { result, workflow, selectedNodeId, selectNode } = useWorkflowAnalysis(rawContent, objectInfo)

function onFixed(fixedJson: string): void {
  rawContent.value = fixedJson
}

function onFixIssue(fixType: FixType): void {
  if (!rawContent.value) return
  const r = fixByType(rawContent.value, fixType, objectInfo.value ?? undefined)
  if (r.changes > 0) rawContent.value = r.fixed
}
</script>

<template>
  <div class="flex flex-row h-screen bg-gray-950 overflow-hidden">
    <!-- Left column: upload -->
    <div class="w-72 flex-shrink-0 border-r border-gray-800 overflow-hidden">
      <UploadPanel
        :file-name="fileName"
        :schema-status="schemaStatus"
        :schema-node-count="objectInfo ? Object.keys(objectInfo).length : 0"
        @file-loaded="onFileLoaded"
        @reset="reset"
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
    <div class="w-72 flex-shrink-0 border-l border-gray-800 overflow-hidden">
      <FixPanel
        :result="result"
        :raw-content="rawContent"
        :file-name="fileName"
        :object-info="objectInfo ?? undefined"
        @apply="onFixed"
      />
    </div>
  </div>
</template>
