<script setup lang="ts">
import { computed, ref, triggerRef, watch } from 'vue'
import type { AnalysisResult, FixType, Issue, Severity } from '../types/workflow'

const props = defineProps<{
  result: AnalysisResult | null
  selectedNodeId: number | null
}>()

const emit = defineEmits<{
  nodeSelect: [id: number | null]
  fix: [fixType: FixType]
}>()

const expanded = ref<Set<number>>(new Set())
const issueEls = ref<(HTMLElement | null)[]>([])

function setIssueEl(el: HTMLElement | null, idx: number): void {
  issueEls.value[idx] = el
}

function toggleExpanded(idx: number): void {
  if (expanded.value.has(idx)) {
    expanded.value.delete(idx)
  } else {
    expanded.value.add(idx)
  }
  triggerRef(expanded)
}

function onIssueClick(issue: Issue, idx: number): void {
  if (issue.detail || issue.suggestion || issue.fixType) toggleExpanded(idx)
}

function onNodeBadgeClick(e: MouseEvent, issue: Issue): void {
  e.stopPropagation()
  if (issue.nodeId !== undefined) emit('nodeSelect', issue.nodeId)
}

const errors = computed(() => props.result?.issues.filter((i) => i.severity === 'error') ?? [])
const warnings = computed(() => props.result?.issues.filter((i) => i.severity === 'warning') ?? [])
const infos = computed(() => props.result?.issues.filter((i) => i.severity === 'info') ?? [])
const orderedIssues = computed<Issue[]>(() => [...errors.value, ...warnings.value, ...infos.value])

const selectedIndices = computed<Set<number>>(() => {
  if (props.selectedNodeId === null) return new Set()
  const set = new Set<number>()
  orderedIssues.value.forEach((issue, idx) => {
    if (issue.nodeId === props.selectedNodeId) set.add(idx)
  })
  return set
})

watch(() => props.selectedNodeId, (newId) => {
  if (newId === null) return
  const firstIdx = orderedIssues.value.findIndex((i) => i.nodeId === newId)
  if (firstIdx === -1) return
  issueEls.value[firstIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
})

function severityIcon(s: Severity): string {
  return s === 'error' ? '✕' : s === 'warning' ? '!' : 'i'
}

function severityIconBg(s: Severity): string {
  return s === 'error'
    ? 'bg-rose-500 text-white shadow-sm shadow-rose-950/40'
    : s === 'warning'
      ? 'bg-amber-500 text-black shadow-sm shadow-amber-950/40'
      : 'bg-sky-500 text-white shadow-sm shadow-sky-950/40'
}

function severityBorder(s: Severity): string {
  return s === 'error'
    ? 'border-rose-900/30 bg-rose-950/5 hover:border-rose-800/40'
    : s === 'warning'
      ? 'border-amber-900/30 bg-amber-950/5 hover:border-amber-800/40'
      : 'border-sky-900/30 bg-sky-950/5 hover:border-sky-800/40'
}

function severityExpandBg(s: Severity): string {
  return s === 'error'
    ? 'border-rose-950 bg-rose-950/10'
    : s === 'warning'
      ? 'border-amber-950 bg-amber-950/10'
      : 'border-sky-950 bg-sky-950/10'
}

function severityTag(s: Severity): string {
  return s === 'error'
    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15 text-[10px] font-bold tracking-wider'
    : s === 'warning'
      ? 'bg-amber-500/10 text-amber-450 border border-amber-500/15 text-[10px] font-bold tracking-wider'
      : 'bg-sky-500/10 text-sky-400 border border-sky-500/15 text-[10px] font-bold tracking-wider'
}

const verdictText = computed(() => {
  if (!props.result) return ''
  if (errors.value.length > 0) return 'This workflow will not run'
  if (warnings.value.length > 0) return 'Workflow has warnings'
  return 'Workflow looks good to run'
})

const verdictStyle = computed(() => {
  if (!props.result) return ''
  if (errors.value.length > 0) return 'text-rose-400 font-display'
  if (warnings.value.length > 0) return 'text-amber-400 font-display'
  return 'text-emerald-450 font-display'
})

const verdictIcon = computed(() => {
  if (!props.result) return ''
  if (errors.value.length > 0) return '✕'
  if (warnings.value.length > 0) return '!'
  return '✓'
})
</script>

<template>
  <div class="flex flex-col h-full bg-ink-900 text-zinc-100 relative">

    <!-- Floating Step 3 Title -->
    <div class="step-title step-title-absolute">
      Step 3: Debug Info Panel
    </div>

    <!-- Empty state -->
    <div v-if="!result" class="h-full flex items-center justify-center bg-ink-900/20">
      <p class="text-zinc-650 text-sm font-semibold tracking-wide font-display">Upload a workflow to see diagnostics</p>
    </div>

    <template v-else>
      <!-- Summary bar -->
      <div class="flex-shrink-0 flex items-center justify-end gap-5 pl-6 pr-6 py-4 border-b border-ink-800 bg-ink-900/40">
        <!-- Verdict -->
        <div class="flex items-center gap-2.5">
          <span class="text-lg font-extrabold leading-none" :class="verdictStyle">{{ verdictIcon }}</span>
          <span class="text-sm font-bold" :class="verdictStyle">{{ verdictText }}</span>
        </div>

        <div class="w-px h-4 bg-ink-800" />

        <span class="text-xs text-zinc-500">
          <span class="text-zinc-300 font-semibold tabular-nums">{{ result.nodeCount }}</span> nodes
        </span>
        <span class="text-xs text-zinc-500">
          <span class="text-zinc-300 font-semibold tabular-nums">{{ result.linkCount }}</span> links
        </span>
      </div>

      <!-- Issues area -->
      <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <!-- No issues -->
        <div v-if="orderedIssues.length === 0" class="h-full flex flex-col items-center justify-center gap-3.5">
          <div class="w-14 h-14 bg-emerald-500/10 border border-emerald-700/20 rounded-full flex items-center justify-center shadow-inner">
            <span class="text-emerald-450 font-bold text-lg">✓</span>
          </div>
          <p class="text-emerald-400 text-sm font-semibold tracking-wide font-display">No issues found</p>
          <p class="text-zinc-600 text-xs">All node connections look valid</p>
        </div>

        <!-- Issues grid -->
        <div
          v-else
          class="grid gap-4"
          style="grid-template-columns: repeat(auto-fill, minmax(380px, 1fr))"
        >
          <div
            v-for="(issue, idx) in orderedIssues"
            :key="idx"
            :ref="(el) => setIssueEl(el as HTMLElement | null, idx)"
            class="border rounded-xl overflow-hidden bg-ink-800/20 transition-all duration-200"
            :class="[severityBorder(issue.severity), selectedIndices.has(idx) ? 'ring-1 ring-brand-yellow/40 bg-ink-800/90 shadow-glow-yellow border-brand-yellow/30' : '']"
          >
            <!-- Card header -->
            <div
              class="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
              @click="onIssueClick(issue, idx)"
            >
              <!-- Severity dot -->
              <div
                class="w-5.5 h-5.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold leading-none"
                :class="severityIconBg(issue.severity)"
              >{{ severityIcon(issue.severity) }}</div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]" :class="severityTag(issue.severity)">
                    {{ issue.severity }}
                  </span>
                  <span
                    v-if="issue.nodeType"
                    class="text-xs font-mono"
                    :class="issue.nodeId !== undefined ? 'text-zinc-400 hover:text-brand-yellow cursor-pointer underline underline-offset-4 decoration-dotted decoration-zinc-700' : 'text-zinc-550'"
                    :title="issue.nodeId !== undefined ? 'Click to highlight in canvas' : undefined"
                    @click.stop="issue.nodeId !== undefined ? onNodeBadgeClick($event, issue) : undefined"
                  >{{ issue.nodeType }}<template v-if="issue.nodeId !== undefined"> #{{ issue.nodeId }}</template></span>
                </div>
                <p class="text-zinc-200 text-sm leading-relaxed">{{ issue.message }}</p>
              </div>

              <svg
                v-if="issue.detail || issue.suggestion || issue.fixType"
                class="w-4 h-4 text-zinc-650 flex-shrink-0 mt-1 transition-transform duration-150"
                :class="expanded.has(idx) ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Expandable detail + fix -->
            <div
              v-if="(issue.detail || issue.suggestion || issue.fixType) && expanded.has(idx)"
              class="border-t border-ink-900/40 px-4 py-3 flex flex-col gap-2.5"
              :class="severityExpandBg(issue.severity)"
            >
              <div v-if="issue.detail" class="flex gap-2.5">
                <span class="text-zinc-500 text-xs font-bold uppercase tracking-widest flex-shrink-0 mt-0.5 font-display">Detail</span>
                <p class="text-zinc-400 text-xs leading-relaxed">{{ issue.detail }}</p>
              </div>
              <div v-if="issue.suggestion || issue.fixType" class="flex items-start justify-between gap-4">
                <div v-if="issue.suggestion" class="flex gap-2.5 flex-1 min-w-0">
                  <span class="text-brand-yellow text-xs font-bold uppercase tracking-widest flex-shrink-0 mt-0.5 font-display">Fix</span>
                  <p class="text-zinc-300 text-xs leading-relaxed">{{ issue.suggestion }}</p>
                </div>
                <button
                  v-if="issue.fixable && issue.fixType"
                  class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-brand-yellow/45 text-brand-yellow hover:bg-brand-yellow/10 hover:border-brand-yellow transition-all duration-150 cursor-pointer"
                  @click.stop="emit('fix', issue.fixType!)"
                >Apply Fix</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>
