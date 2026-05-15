<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AnalysisResult, ObjectInfo } from '../types/workflow'
import { fixWorkflow } from '../lib/fixer'
import type { FixResult } from '../lib/fixer'

const props = defineProps<{
  result: AnalysisResult | null
  rawContent: string | null
  fileName: string | null
  objectInfo?: ObjectInfo
}>()

const emit = defineEmits<{ apply: [fixedJson: string] }>()

const fixApplied = ref(false)
const fixChanges = ref(0)
const fixPartial = ref(false)
const fixedJson = ref<string | null>(null)
const fixedMediaFiles = ref<string[]>([])

const fixableCount = computed(() =>
  props.result?.issues.filter((i) => i.fixable).length ?? 0
)

const canFix = computed(() =>
  props.result !== null &&
  props.result.format === 'graph' &&
  fixableCount.value > 0 &&
  props.rawContent !== null &&
  !fixApplied.value
)

watch(() => props.rawContent, () => {
  fixApplied.value = false
  fixChanges.value = 0
  fixPartial.value = false
  fixedJson.value = null
  fixedMediaFiles.value = []
})

function applyFix(): void {
  if (!props.rawContent) return
  const result: FixResult = fixWorkflow(props.rawContent, props.objectInfo)
  fixedJson.value = result.fixed
  fixChanges.value = result.changes
  fixPartial.value = result.partial
  fixedMediaFiles.value = result.mediaFiles
  fixApplied.value = true
  emit('apply', result.fixed)
}

function download(): void {
  if (!fixedJson.value) return
  const base = props.fileName
    ? props.fileName.replace(/\.json$/i, '')
    : 'workflow'
  const blob = new Blob([fixedJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${base}_fixed.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-950">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 border-b border-gray-800">
      <p class="text-sm font-bold text-gray-100 tracking-tight">Auto Fix</p>
      <p class="text-xs text-gray-600 mt-0.5">Clean up broken link references</p>
    </div>

    <!-- Body -->
    <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-4">

      <!-- Big circular Fix button, always centered -->
      <div class="flex flex-col items-center justify-center gap-3 py-4">
        <button
          class="fix-circle-btn"
          :class="{
            'fix-circle-active': canFix,
            'fix-circle-done': fixApplied,
            'fix-circle-disabled': !canFix && !fixApplied,
          }"
          :disabled="!canFix"
          @click="applyFix"
        >
          <span class="fix-circle-label">{{ fixApplied ? '✓' : 'Fix' }}</span>
        </button>
        <!-- Status hint below button -->
        <p v-if="!result" class="text-gray-700 text-xs text-center leading-relaxed">Upload a workflow<br>to enable fixing</p>
        <p v-else-if="result.format !== 'graph'" class="text-gray-600 text-xs text-center">Graph format only</p>
        <template v-else-if="fixApplied">
          <p class="text-xs text-center" style="color: #39ff14;">Fixed {{ fixChanges }} issue{{ fixChanges !== 1 ? 's' : '' }}</p>
          <p v-if="fixPartial" class="text-yellow-400 text-xs text-center">Some issues could not be auto-fixed</p>
          <!-- Export button -->
          <button class="export-btn" @click="download">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v13m0 0l-4-4m4 4l4-4" />
            </svg>
            Export
          </button>
        </template>
        <p v-else-if="fixableCount === 0" class="text-green-500 text-xs text-center">Nothing to fix</p>
        <p v-else class="text-yellow-400 text-xs text-center">{{ fixableCount }} fixable issue{{ fixableCount !== 1 ? 's' : '' }} found</p>
      </div>

      <!-- What we fix (static info) -->
      <div v-if="result?.format === 'graph'" class="flex flex-col gap-2">
        <p class="text-xs text-gray-600 uppercase tracking-wider font-semibold">What gets fixed</p>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-start gap-2">
            <span class="text-gray-600 text-xs mt-0.5 flex-shrink-0">•</span>
            <span class="text-gray-500 text-xs leading-relaxed">Node slots referencing non-existent link IDs</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-gray-600 text-xs mt-0.5 flex-shrink-0">•</span>
            <span class="text-gray-500 text-xs leading-relaxed">Links pointing to missing nodes → remapped by ID proximity and type, or removed if ambiguous</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-gray-600 text-xs mt-0.5 flex-shrink-0">•</span>
            <span class="text-gray-500 text-xs leading-relaxed">Link type metadata mismatches → corrected to match the source output slot type</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-gray-600 text-xs mt-0.5 flex-shrink-0">•</span>
            <span class="text-gray-500 text-xs leading-relaxed">Type-mismatched connections → conversion node inserted (e.g. IMAGE→LATENT via VAEEncode)</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-gray-600 text-xs mt-0.5 flex-shrink-0">•</span>
            <span class="text-gray-500 text-xs leading-relaxed">Unconnected required inputs → wired to an existing matching output, or a source node inserted</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-gray-600 text-xs mt-0.5 flex-shrink-0">•</span>
            <span class="text-gray-500 text-xs leading-relaxed">Stale media file refs (temp files, UUID names) → replaced with test data files</span>
          </div>
        </div>
      </div>

      <!-- After fix: which media files to copy to ComfyUI input/ -->
      <div
        v-if="fixApplied && fixedMediaFiles.length > 0"
        class="bg-yellow-950/20 border border-yellow-700/30 rounded-lg p-3 flex flex-col gap-2"
      >
        <p class="text-yellow-300 text-xs font-semibold">Copy these files to ComfyUI's <code class="font-mono bg-gray-800 px-1 rounded">input/</code> folder:</p>
        <div class="flex flex-col gap-1">
          <div v-for="f in fixedMediaFiles" :key="f" class="font-mono text-xs text-yellow-200 bg-gray-900 px-2 py-1 rounded truncate" :title="f">{{ f }}</div>
        </div>
        <p class="text-gray-600 text-xs">Test files are in <span class="font-mono">comfy_workflow_debuger/test data/</span></p>
      </div>

    </div>

  </div>
</template>

<style scoped>
.fix-circle-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid #39ff14;
  background: radial-gradient(circle at 40% 35%, #0d2b0d, #050f05);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s, border-color 0.2s;
  position: relative;
  flex-shrink: 0;
}

.fix-circle-label {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #39ff14;
  text-shadow: 0 0 12px #39ff14, 0 0 28px #39ff1480;
  user-select: none;
  line-height: 1;
}

.fix-circle-active {
  box-shadow: 0 0 18px 4px #39ff1440, 0 0 6px 1px #39ff1466;
  animation: fix-pulse 2s ease-in-out infinite;
}

.fix-circle-active:hover {
  transform: scale(1.06);
  box-shadow: 0 0 32px 8px #39ff1460, 0 0 10px 2px #39ff14aa;
}

.fix-circle-active:active {
  transform: scale(0.97);
}

.fix-circle-done {
  border-color: #39ff14;
  box-shadow: 0 0 24px 6px #39ff1455;
  cursor: default;
}

.fix-circle-disabled {
  border-color: #2a2a2a;
  background: radial-gradient(circle at 40% 35%, #111, #080808);
  cursor: not-allowed;
}

.fix-circle-disabled .fix-circle-label {
  color: #333;
  text-shadow: none;
}

@keyframes fix-pulse {
  0%, 100% { box-shadow: 0 0 18px 4px #39ff1440, 0 0 6px 1px #39ff1466; }
  50%       { box-shadow: 0 0 30px 8px #39ff1460, 0 0 10px 3px #39ff14aa; }
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 24px;
  border-radius: 999px;
  border: 2px solid #39ff14;
  background: transparent;
  color: #39ff14;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
  text-shadow: 0 0 8px #39ff1480;
}

.export-btn:hover {
  background: #39ff1415;
  box-shadow: 0 0 16px 2px #39ff1440;
  transform: scale(1.04);
}

.export-btn:active {
  transform: scale(0.97);
}
</style>
