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
    ? 'bg-red-500 text-white'
    : s === 'warning'
      ? 'bg-yellow-500 text-gray-900'
      : 'bg-blue-500 text-white'
}

function severityBorder(s: Severity): string {
  return s === 'error'
    ? 'border-red-700/40 hover:border-red-600/60'
    : s === 'warning'
      ? 'border-yellow-700/40 hover:border-yellow-600/60'
      : 'border-blue-700/40 hover:border-blue-600/60'
}

function severityExpandBg(s: Severity): string {
  return s === 'error'
    ? 'border-red-900/40 bg-red-950/20'
    : s === 'warning'
      ? 'border-yellow-900/40 bg-yellow-950/20'
      : 'border-blue-900/40 bg-blue-950/20'
}

function severityTag(s: Severity): string {
  return s === 'error'
    ? 'bg-red-500/15 text-red-400 border border-red-500/25'
    : s === 'warning'
      ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
      : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
}

const verdictText = computed(() => {
  if (!props.result) return ''
  if (errors.value.length > 0) return 'This workflow will not run'
  if (warnings.value.length > 0) return 'Workflow has warnings'
  return 'Workflow looks good to run'
})

const verdictStyle = computed(() => {
  if (!props.result) return ''
  if (errors.value.length > 0) return 'text-red-400'
  if (warnings.value.length > 0) return 'text-yellow-400'
  return 'text-green-400'
})

const verdictIcon = computed(() => {
  if (!props.result) return ''
  if (errors.value.length > 0) return '✕'
  if (warnings.value.length > 0) return '!'
  return '✓'
})
</script>

<template>
  <div class="flex flex-col h-full bg-gray-950 text-gray-100">

    <!-- Empty state -->
    <div v-if="!result" class="h-full flex items-center justify-center">
      <p class="text-gray-700 text-sm">Upload a workflow to see diagnostics</p>
    </div>

    <template v-else>
      <!-- Summary bar -->
      <div class="flex-shrink-0 flex items-center gap-4 px-6 py-3 border-b border-gray-800 bg-gray-950">
        <!-- Verdict -->
        <div class="flex items-center gap-2">
          <span class="text-base font-bold leading-none" :class="verdictStyle">{{ verdictIcon }}</span>
          <span class="text-sm font-semibold" :class="verdictStyle">{{ verdictText }}</span>
        </div>

        <div class="w-px h-4 bg-gray-800" />

        <!-- Stats chips -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-gray-500">
            <span class="text-gray-300 font-semibold tabular-nums">{{ result.nodeCount }}</span> nodes
          </span>
          <span v-if="result.format === 'graph'" class="text-xs text-gray-500">
            <span class="text-gray-300 font-semibold tabular-nums">{{ result.linkCount }}</span> links
          </span>
          <span
            v-if="errors.length > 0"
            class="text-xs px-2 py-0.5 rounded-md font-medium"
            :class="severityTag('error')"
          >{{ errors.length }} error{{ errors.length !== 1 ? 's' : '' }}</span>
          <span
            v-if="warnings.length > 0"
            class="text-xs px-2 py-0.5 rounded-md font-medium"
            :class="severityTag('warning')"
          >{{ warnings.length }} warning{{ warnings.length !== 1 ? 's' : '' }}</span>
          <span
            v-if="infos.length > 0"
            class="text-xs px-2 py-0.5 rounded-md font-medium"
            :class="severityTag('info')"
          >{{ infos.length }} info</span>
        </div>

        <div class="ml-auto text-xs text-gray-700 font-mono">
          {{ result.format === 'graph' ? 'Graph format' : result.format === 'api' ? 'API format' : 'Unknown format' }}
        </div>
      </div>

      <!-- Issues area -->
      <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        <!-- No issues -->
        <div v-if="orderedIssues.length === 0" class="h-full flex flex-col items-center justify-center gap-3">
          <div class="w-12 h-12 bg-green-500/10 border border-green-700/30 rounded-full flex items-center justify-center">
            <span class="text-green-400 font-bold">✓</span>
          </div>
          <p class="text-green-300 text-sm font-medium">No issues found</p>
          <p class="text-gray-600 text-xs">All connections look valid</p>
        </div>

        <!-- Issues grid -->
        <div
          v-else
          class="grid gap-3"
          style="grid-template-columns: repeat(auto-fill, minmax(380px, 1fr))"
        >
          <div
            v-for="(issue, idx) in orderedIssues"
            :key="idx"
            :ref="(el) => setIssueEl(el as HTMLElement | null, idx)"
            class="border rounded-lg overflow-hidden bg-gray-900 transition-colors"
            :class="[severityBorder(issue.severity), selectedIndices.has(idx) ? 'ring-1 ring-blue-500/60 bg-gray-800' : '']"
          >
            <!-- Card header -->
            <div
              class="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer"
              @click="onIssueClick(issue, idx)"
            >
              <!-- Severity dot -->
              <div
                class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                :class="severityIconBg(issue.severity)"
              >{{ severityIcon(issue.severity) }}</div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span class="text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide" :class="severityTag(issue.severity)">
                    {{ issue.severity }}
                  </span>
                  <span
                    v-if="issue.nodeType"
                    class="text-xs font-mono"
                    :class="issue.nodeId !== undefined ? 'text-gray-500 hover:text-blue-400 cursor-pointer underline underline-offset-2 decoration-dotted' : 'text-gray-600'"
                    :title="issue.nodeId !== undefined ? 'Click to highlight in canvas' : undefined"
                    @click.stop="issue.nodeId !== undefined ? onNodeBadgeClick($event, issue) : undefined"
                  >{{ issue.nodeType }}<template v-if="issue.nodeId !== undefined"> #{{ issue.nodeId }}</template></span>
                </div>
                <p class="text-gray-200 text-xs leading-relaxed">{{ issue.message }}</p>
              </div>

              <svg
                v-if="issue.detail || issue.suggestion || issue.fixType"
                class="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-1 transition-transform duration-150"
                :class="expanded.has(idx) ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Expandable detail + fix -->
            <div
              v-if="(issue.detail || issue.suggestion || issue.fixType) && expanded.has(idx)"
              class="border-t px-3 py-2 flex flex-col gap-1.5"
              :class="severityExpandBg(issue.severity)"
            >
              <div v-if="issue.detail" class="flex gap-2">
                <span class="text-gray-500 text-xs font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5">Detail</span>
                <p class="text-gray-400 text-xs leading-relaxed">{{ issue.detail }}</p>
              </div>
              <div v-if="issue.suggestion || issue.fixType" class="flex items-start justify-between gap-3">
                <div v-if="issue.suggestion" class="flex gap-2 flex-1 min-w-0">
                  <span class="text-blue-500 text-xs font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5">Fix</span>
                  <p class="text-blue-300 text-xs leading-relaxed">{{ issue.suggestion }}</p>
                </div>
                <button
                  v-if="issue.fixable && issue.fixType"
                  class="flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold border border-[#39ff14]/50 text-[#39ff14] hover:bg-[#39ff14]/10 hover:border-[#39ff14]/80 transition-colors duration-150 cursor-pointer"
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
