<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnalysisResult, Issue, Severity } from '../types/workflow'

const props = defineProps<{
  fileName: string | null
  result: AnalysisResult | null
}>()

const emit = defineEmits<{
  fileLoaded: [name: string, content: string]
  reset: []
}>()

// ---- Upload state ----
const isDragging = ref(false)
const errorMsg = ref<string | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)

function readFile(file: File): void {
  errorMsg.value = null
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result
    if (typeof content === 'string') {
      emit('fileLoaded', file.name, content)
    } else {
      errorMsg.value = 'Failed to read file'
    }
  }
  reader.onerror = () => {
    errorMsg.value = 'Failed to read file'
  }
  reader.readAsText(file)
}

function onDragOver(e: DragEvent): void {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave(): void {
  isDragging.value = false
}

function onDrop(e: DragEvent): void {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) readFile(file)
}

function onFileInput(e: Event): void {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) readFile(file)
  target.value = ''
}

function triggerInput(): void {
  fileInputEl.value?.click()
}

// ---- Analysis results state ----
const expanded = ref<Set<number>>(new Set())

function toggleExpanded(index: number): void {
  if (expanded.value.has(index)) {
    expanded.value.delete(index)
  } else {
    expanded.value.add(index)
  }
  expanded.value = new Set(expanded.value)
}

const errors = computed(() => props.result?.issues.filter((i) => i.severity === 'error') ?? [])
const warnings = computed(() => props.result?.issues.filter((i) => i.severity === 'warning') ?? [])
const infos = computed(() => props.result?.issues.filter((i) => i.severity === 'info') ?? [])

const orderedIssues = computed<Issue[]>(() => [
  ...errors.value,
  ...warnings.value,
  ...infos.value,
])

function severityIcon(severity: Severity): string {
  if (severity === 'error') return '✕'
  if (severity === 'warning') return '!'
  return 'i'
}

function severityBadgeClass(severity: Severity): string {
  if (severity === 'error') return 'bg-red-500/20 text-red-400 border border-red-500/30'
  if (severity === 'warning') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
  return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
}

function severityIconClass(severity: Severity): string {
  if (severity === 'error') return 'bg-red-500 text-white'
  if (severity === 'warning') return 'bg-yellow-500 text-gray-900'
  return 'bg-blue-500 text-white'
}

function severityLabel(severity: Severity): string {
  if (severity === 'error') return 'ERROR'
  if (severity === 'warning') return 'WARNING'
  return 'INFO'
}

const verdictBorderClass = computed(() => {
  if (errors.value.length > 0) return 'border-l-4 border-l-red-500 bg-red-950/50 border border-red-700/50'
  if (warnings.value.length > 0) return 'border-l-4 border-l-yellow-500 bg-yellow-950/40 border border-yellow-700/50'
  return 'border-l-4 border-l-green-500 bg-green-950/40 border border-green-700/50'
})

const verdictIconClass = computed(() => {
  if (errors.value.length > 0) return 'text-red-400'
  if (warnings.value.length > 0) return 'text-yellow-400'
  return 'text-green-400'
})

const verdictText = computed(() => {
  if (errors.value.length > 0) return 'This workflow will not run'
  if (warnings.value.length > 0) return 'Workflow has warnings'
  return 'Looks good to run'
})

const formatLabel = computed(() => {
  if (props.result?.format === 'graph') return 'Graph format'
  if (props.result?.format === 'api') return 'API/prompt format'
  return 'Unknown format'
})
</script>

<template>
  <div class="flex flex-col h-full bg-gray-950 overflow-hidden">

    <!-- UPLOAD STATE -->
    <div
      v-if="result === null"
      class="flex flex-col items-center justify-center h-full px-5 py-6"
    >
      <div class="mb-6 text-center">
        <h1 class="text-lg font-bold text-gray-100 tracking-tight">ComfyUI Workflow Debugger</h1>
        <p class="mt-1 text-gray-500 text-xs">Analyze workflow JSON offline</p>
      </div>

      <div
        class="w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200"
        :class="isDragging
          ? 'border-blue-400 bg-blue-950/30 scale-[1.01]'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/60'"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="triggerInput"
      >
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200"
          :class="isDragging ? 'bg-blue-500/20' : 'bg-gray-800'"
        >
          <svg
            class="w-6 h-6 transition-colors duration-200"
            :class="isDragging ? 'text-blue-400' : 'text-gray-500'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <div class="text-center select-none">
          <p class="text-gray-200 text-sm font-medium">Drop workflow JSON here</p>
          <p class="text-gray-500 text-xs mt-1">or <span class="text-blue-400 underline underline-offset-2">click to browse</span></p>
        </div>
      </div>

      <p v-if="errorMsg" class="mt-3 text-red-400 text-xs text-center">{{ errorMsg }}</p>

      <input
        ref="fileInputEl"
        type="file"
        accept=".json,application/json,text/plain"
        class="hidden"
        @change="onFileInput"
      />
    </div>

    <!-- RESULT STATE -->
    <template v-else>
      <!-- Fixed header (non-scrollable) -->
      <div class="flex-shrink-0 flex items-center gap-2 px-4 h-14 border-b border-gray-800">
        <div class="w-7 h-7 bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <span class="text-gray-300 text-sm font-mono truncate flex-1 min-w-0" :title="fileName ?? ''">{{ fileName }}</span>
        <button
          class="flex-shrink-0 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-md px-2.5 py-1 transition-colors"
          @click="emit('reset')"
        >
          ✕ Clear
        </button>
      </div>

      <!-- Scrollable results area -->
      <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        <!-- Verdict banner -->
        <div class="rounded-lg px-3 py-2.5 flex items-center gap-3" :class="verdictBorderClass">
          <span class="text-base font-bold leading-none" :class="verdictIconClass">
            <span v-if="errors.length > 0">✕</span>
            <span v-else-if="warnings.length > 0">!</span>
            <span v-else>✓</span>
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-tight" :class="verdictIconClass">{{ verdictText }}</p>
            <p class="text-gray-500 text-xs mt-0.5">{{ formatLabel }}</p>
          </div>
        </div>

        <!-- Stats chips -->
        <div class="flex flex-wrap gap-2">
          <div class="bg-gray-900 border border-gray-800 rounded-md px-3 py-1.5 flex items-center gap-1.5">
            <span class="text-gray-500 text-xs">Nodes</span>
            <span class="text-gray-100 text-xs font-semibold tabular-nums">{{ result.nodeCount }}</span>
          </div>
          <div v-if="result.format === 'graph'" class="bg-gray-900 border border-gray-800 rounded-md px-3 py-1.5 flex items-center gap-1.5">
            <span class="text-gray-500 text-xs">Links</span>
            <span class="text-gray-100 text-xs font-semibold tabular-nums">{{ result.linkCount }}</span>
          </div>
          <div v-if="errors.length > 0" class="rounded-md px-3 py-1.5 flex items-center gap-1 text-xs" :class="severityBadgeClass('error')">
            <span class="font-semibold tabular-nums">{{ errors.length }}</span>
            <span>error{{ errors.length !== 1 ? 's' : '' }}</span>
          </div>
          <div v-if="warnings.length > 0" class="rounded-md px-3 py-1.5 flex items-center gap-1 text-xs" :class="severityBadgeClass('warning')">
            <span class="font-semibold tabular-nums">{{ warnings.length }}</span>
            <span>warning{{ warnings.length !== 1 ? 's' : '' }}</span>
          </div>
          <div v-if="infos.length > 0" class="rounded-md px-3 py-1.5 flex items-center gap-1 text-xs" :class="severityBadgeClass('info')">
            <span class="font-semibold tabular-nums">{{ infos.length }}</span>
            <span>info</span>
          </div>
        </div>

        <!-- No issues -->
        <div
          v-if="orderedIssues.length === 0"
          class="bg-green-950/30 border border-green-800/40 rounded-xl p-6 text-center"
        >
          <div class="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <span class="text-green-400 text-lg font-bold">✓</span>
          </div>
          <p class="text-green-300 text-sm font-medium">No issues found!</p>
          <p class="text-gray-500 text-xs mt-1">All connections look valid.</p>
        </div>

        <!-- Issues list -->
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="(issue, idx) in orderedIssues"
            :key="idx"
            class="bg-gray-900 border rounded-lg overflow-hidden transition-colors"
            :class="{
              'border-red-700/40 hover:border-red-600/50': issue.severity === 'error',
              'border-yellow-700/40 hover:border-yellow-600/50': issue.severity === 'warning',
              'border-blue-700/40 hover:border-blue-600/50': issue.severity === 'info',
            }"
          >
            <!-- Issue header -->
            <div
              class="flex items-start gap-2.5 p-3"
              :class="(issue.detail || issue.suggestion) ? 'cursor-pointer' : ''"
              @click="(issue.detail || issue.suggestion) ? toggleExpanded(idx) : undefined"
            >
              <div
                class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                :class="severityIconClass(issue.severity)"
              >
                {{ severityIcon(issue.severity) }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span
                    class="text-xs font-semibold px-1 py-0.5 rounded uppercase tracking-wider"
                    :class="severityBadgeClass(issue.severity)"
                  >{{ severityLabel(issue.severity) }}</span>
                  <span v-if="issue.nodeType" class="text-xs text-gray-600 font-mono">{{ issue.nodeType }}<template v-if="issue.nodeId !== undefined"> #{{ issue.nodeId }}</template></span>
                </div>
                <p class="text-gray-300 text-xs leading-relaxed">{{ issue.message }}</p>
              </div>

              <div
                v-if="issue.detail || issue.suggestion"
                class="flex-shrink-0 text-gray-600 mt-0.5"
              >
                <svg
                  class="w-3.5 h-3.5 transition-transform duration-200"
                  :class="expanded.has(idx) ? 'rotate-180' : ''"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <!-- Expandable detail / suggestion -->
            <div
              v-if="(issue.detail || issue.suggestion) && expanded.has(idx)"
              class="border-t px-3 py-2 flex flex-col gap-1.5"
              :class="{
                'border-red-900/40 bg-red-950/20': issue.severity === 'error',
                'border-yellow-900/40 bg-yellow-950/20': issue.severity === 'warning',
                'border-blue-900/40 bg-blue-950/20': issue.severity === 'info',
              }"
            >
              <div v-if="issue.detail" class="flex items-start gap-2">
                <span class="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-0.5 flex-shrink-0">Detail</span>
                <p class="text-gray-400 text-xs leading-relaxed">{{ issue.detail }}</p>
              </div>
              <div v-if="issue.suggestion" class="flex items-start gap-2">
                <span class="text-blue-500 text-xs font-semibold uppercase tracking-wider mt-0.5 flex-shrink-0">Fix</span>
                <p class="text-blue-300 text-xs leading-relaxed">{{ issue.suggestion }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Hidden file input for re-upload -->
      <input
        ref="fileInputEl"
        type="file"
        accept=".json,application/json,text/plain"
        class="hidden"
        @change="onFileInput"
      />
    </template>

  </div>
</template>
