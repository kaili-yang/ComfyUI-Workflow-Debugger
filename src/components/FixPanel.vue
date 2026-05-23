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
  <div class="flex flex-col h-full bg-transparent">
    <!-- Header -->
    <div class="flex-shrink-0 px-6 py-5 border-b border-ink-800 bg-ink-900/20">
      <p class="text-sm font-bold text-zinc-100 tracking-tight font-display">Auto Fix</p>
      <p class="text-xs text-zinc-500 mt-1">Clean up broken link references automatically</p>
    </div>

    <!-- Body -->
    <div class="flex-1 min-h-0 overflow-y-auto px-6 py-6 flex flex-col gap-6">

      <!-- Big circular Fix button, always centered -->
      <div class="flex flex-col items-center justify-center gap-4.5 py-6">
        <button
          class="fix-circle-btn"
          :class="{
            'fix-circle-active': canFix,
            'fix-circle-done': fixApplied,
            'fix-circle-disabled': !canFix && !fixApplied,
          }"
          :disabled="!canFix && !fixApplied"
          @click="fixApplied ? download() : applyFix()"
        >
          <span class="fix-circle-label">{{ fixApplied ? 'Export' : 'Fix' }}</span>
        </button>
        <!-- Status hint below button -->
        <p v-if="!result" class="text-zinc-650 text-xs text-center leading-relaxed">Upload a workflow<br>to enable auto-fixing</p>
        <p v-else-if="result.format !== 'graph'" class="text-zinc-600 text-xs text-center leading-relaxed">Automatic fixing is supported<br>for Graph format only</p>
        <template v-else-if="fixApplied">
          <p class="text-sm text-center font-semibold text-brand-yellow">Fixed {{ fixChanges }} issue{{ fixChanges !== 1 ? 's' : '' }}</p>
          <p v-if="fixPartial" class="text-amber-500 text-xs text-center leading-relaxed">Some issues could not be fixed</p>
        </template>
        <p v-else-if="fixableCount === 0" class="text-emerald-400 text-xs text-center font-medium">No issues require fixing</p>
        <p v-else class="text-brand-yellow text-xs font-semibold text-center">{{ fixableCount }} fixable issue{{ fixableCount !== 1 ? 's' : '' }} found</p>
      </div>

      <!-- What got fixed (animated, shown only after fix) -->
      <div v-if="fixApplied && fixBreakdown.length > 0" class="flex flex-col gap-3">
        <p class="text-xs text-zinc-500 uppercase tracking-widest font-bold font-display px-0.5">What got fixed</p>
        <div class="flex flex-col gap-2">
          <div
            v-for="(item, idx) in fixBreakdown"
            :key="item.label"
            class="fix-item flex items-center gap-3 px-3 py-2.5 rounded-xl bg-ink-800/20 border border-brand-yellow/15 shadow-sm"
            :style="{ animationDelay: `${idx * 90}ms` }"
          >
            <span class="fix-check text-sm leading-none flex-shrink-0 text-brand-yellow">✓</span>
            <span class="text-zinc-350 text-xs leading-relaxed flex-1 min-w-0 font-medium">{{ item.label }}</span>
            <span class="text-brand-yellow text-xs font-bold tabular-nums flex-shrink-0 bg-brand-yellow/5 px-2 py-0.5 rounded-md border border-brand-yellow/10">+{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- TODO: dynamic media file validation (future) -->

    </div>

    <!-- Footer: export -->
    <div class="flex-shrink-0 border-t border-ink-800 px-6 py-5 bg-ink-900/20">
      <button
        class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer shadow-sm"
        :class="rawContent
          ? 'border-brand-yellow/45 text-brand-yellow hover:bg-brand-yellow/10 hover:border-brand-yellow'
          : 'border-ink-700 text-zinc-600 cursor-not-allowed'"
        :disabled="!rawContent"
        @click="download"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v13m0 0l-4-4m4 4l4-4" />
        </svg>
        Export fixed workflow
      </button>
    </div>

  </div>
</template>

<style scoped>
.fix-circle-btn {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 3.5px solid #232025;
  background: radial-gradient(circle at 40% 35%, #29252c, #151317);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: box-shadow 0.25s, transform 0.2s, border-color 0.25s, background 0.25s;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.fix-circle-label {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: #5c5362;
  user-select: none;
  line-height: 1;
  transition: color 0.25s;
}

.fix-circle-active {
  border-color: #f0ff41;
  background: #f0ff41;
  animation: comfy-pulse 2s ease-in-out infinite;
}

.fix-circle-active .fix-circle-label {
  color: #151317;
  text-shadow: none;
}

.fix-circle-active:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(240, 255, 65, 0.4);
}

.fix-circle-active:active {
  transform: scale(0.97);
}

.fix-circle-done {
  border-color: #f0ff41;
  background: #f0ff41;
  box-shadow: 0 0 24px 6px rgba(240, 255, 65, 0.35);
  cursor: pointer;
  animation: comfy-pulse 2s ease-in-out infinite;
}

.fix-circle-done .fix-circle-label {
  color: #151317;
  text-shadow: none;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.fix-circle-done:hover {
  transform: scale(1.05);
  box-shadow: 0 0 32px rgba(240, 255, 65, 0.5);
}

.fix-circle-done:active {
  transform: scale(0.97);
}

.fix-circle-disabled {
  border-color: #232025;
  background: radial-gradient(circle at 40% 35%, #19161a, #151317);
  cursor: not-allowed;
  box-shadow: none;
}

.fix-circle-disabled .fix-circle-label {
  color: #353139;
  text-shadow: none;
}

.fix-item {
  animation: fix-item-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.fix-check {
  text-shadow: 0 0 8px rgba(240, 255, 65, 0.6);
  animation: fix-check-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes fix-item-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fix-check-pop {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}
</style>
