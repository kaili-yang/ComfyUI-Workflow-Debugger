<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AnalysisResult, ObjectInfo } from '../types/workflow'
import { fixWorkflow } from '../lib/fixer'
import type { FixResult, BreakdownItem } from '../lib/fixer'

const props = defineProps<{
  result: AnalysisResult | null
  rawContent: string | null
  fileName: string | null
  objectInfo?: ObjectInfo
}>()

const emit = defineEmits<{ apply: [fixedJson: string, newNodeIds: number[], newLinkIds: number[]] }>()

const fixApplied = ref(false)
const fixChanges = ref(0)
const fixPartial = ref(false)
const fixedJson = ref<string | null>(null)
const fixedMediaFiles = ref<string[]>([])
const fixBreakdown = ref<BreakdownItem[]>([])

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

watch(() => props.rawContent, (newContent) => {
  if (newContent === fixedJson.value) return
  fixApplied.value = false
  fixChanges.value = 0
  fixPartial.value = false
  fixedJson.value = null
  fixedMediaFiles.value = []
  fixBreakdown.value = []
})

function applyFix(): void {
  if (!props.rawContent) return
  const result: FixResult = fixWorkflow(props.rawContent, props.objectInfo)
  fixedJson.value = result.fixed
  fixChanges.value = result.changes
  fixPartial.value = result.partial
  fixedMediaFiles.value = result.mediaFiles
  fixBreakdown.value = result.breakdown
  fixApplied.value = true
  emit('apply', result.fixed, result.newNodeIds, result.newLinkIds)
}

function download(): void {
  const content = fixedJson.value ?? props.rawContent
  if (!content) return
  const base = props.fileName
    ? props.fileName.replace(/\.json$/i, '')
    : 'workflow'
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fixed_${base}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
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
        </template>
        <p v-else-if="fixableCount === 0" class="text-green-500 text-xs text-center">Nothing to fix</p>
        <p v-else class="text-yellow-400 text-xs text-center">{{ fixableCount }} fixable issue{{ fixableCount !== 1 ? 's' : '' }} found</p>
      </div>

      <!-- What got fixed (animated, shown only after fix) -->
      <div v-if="fixApplied && fixBreakdown.length > 0" class="flex flex-col gap-2">
        <p class="text-xs text-gray-600 uppercase tracking-wider font-semibold px-0.5">What got fixed</p>
        <div class="flex flex-col gap-1">
          <div
            v-for="(item, idx) in fixBreakdown"
            :key="item.label"
            class="fix-item flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-900 border border-[#39ff14]/20"
            :style="{ animationDelay: `${idx * 90}ms` }"
          >
            <span class="fix-check text-sm leading-none flex-shrink-0">✓</span>
            <span class="text-gray-300 text-xs leading-relaxed flex-1 min-w-0">{{ item.label }}</span>
            <span class="text-[#39ff14] text-xs font-bold tabular-nums flex-shrink-0">+{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- TODO: dynamic media file validation (future) -->

    </div>

    <!-- Footer: export -->
    <div class="flex-shrink-0 border-t border-gray-800 px-4 py-3">
      <button
        class="w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold tracking-wide transition-all duration-150"
        :class="rawContent
          ? 'border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14]/10 cursor-pointer'
          : 'border-gray-800 text-gray-700 cursor-not-allowed'"
        :disabled="!rawContent"
        @click="download"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v13m0 0l-4-4m4 4l4-4" />
        </svg>
        Export fixed workflow
      </button>
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

.fix-item {
  animation: fix-item-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.fix-check {
  color: #39ff14;
  text-shadow: 0 0 8px #39ff14bb;
  animation: fix-check-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes fix-item-in {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes fix-check-pop {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}

</style>
