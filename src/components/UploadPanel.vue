<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  fileName: string | null
  schemaStatus: 'idle' | 'loading' | 'connected' | 'cached' | 'error'
  schemaNodeCount: number
  cachedAt: string | null
}>()

const emit = defineEmits<{
  fileLoaded: [name: string, content: string]
  reset: []
  connect: [url: string]
  disconnect: []
}>()

const features = [
  { label: 'No model downloads required — runs offline', done: true },
  { label: 'Detect broken links & missing nodes', done: true },
  { label: 'Type mismatch & cycle detection', done: true },
  { label: 'Visual node graph with error highlights', done: true },
  { label: 'Auto-fix common errors', done: true },
  { label: 'Improvement suggestions per node', done: false },
  { label: 'Node performance profiling', done: false },
]

const isDragging = ref(false)
const errorMsg = ref<string | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)
const serverUrl = ref('http://localhost:8188')
const serverEnabled = ref(false)

function toggleServer(): void {
  serverEnabled.value = !serverEnabled.value
  if (!serverEnabled.value) emit('disconnect')
}

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

function onPaste(e: ClipboardEvent): void {
  // Ignore paste events that originate from an input/textarea (e.g. the URL field)
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
  const text = e.clipboardData?.getData('text')
  if (!text?.trim()) return
  errorMsg.value = null
  try {
    JSON.parse(text)  // validate before accepting
    emit('fileLoaded', 'pasted-workflow.json', text)
  } catch {
    errorMsg.value = 'Pasted text is not valid JSON'
  }
}

function formatCachedAt(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

onMounted(() => document.addEventListener('paste', onPaste))
onUnmounted(() => document.removeEventListener('paste', onPaste))
</script>

<template>
  <div class="flex flex-col h-full bg-transparent overflow-y-auto">
    <!-- Step 1: Upload -->
    <div id="tour-step-1" class="flex-1 flex flex-col gap-4 p-6 min-h-[280px] border-b border-ink-800">
      <div class="step-title">Step 1: Upload a workflow</div>

      <!-- File loaded state -->
      <template v-if="props.fileName">
        <div class="flex-1 flex flex-col items-center justify-center gap-3.5 bg-ink-800/40 border border-ink-700 rounded-2xl p-6 text-center shadow-sm">
          <div class="w-12 h-12 bg-brand-yellow/10 border border-brand-yellow/20 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-brand-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-zinc-200 text-sm font-semibold font-mono break-all leading-relaxed">{{ props.fileName }}</p>
        </div>
        <button
          class="w-full py-2.5 text-sm font-semibold text-zinc-300 bg-ink-800 hover:bg-ink-700 border border-ink-700 hover:border-ink-600 rounded-xl transition-all duration-150 cursor-pointer text-center"
          @click="triggerInput"
        >
          Upload another
        </button>
        <button
          class="w-full py-2.5 text-sm font-semibold text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/30 border border-red-900/30 hover:border-red-900/50 rounded-xl transition-all duration-150 cursor-pointer text-center"
          @click="emit('reset')"
        >
          Clear
        </button>
      </template>

      <!-- Upload state -->
      <template v-else>
        <div
          class="flex-1 flex flex-col items-center justify-center gap-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 select-none p-6 text-center"
          :class="isDragging
            ? 'border-brand-yellow bg-brand-yellow/5 shadow-glow-yellow'
            : 'border-ink-700 bg-ink-800/20 hover:border-ink-600 hover:bg-ink-800/40'"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="triggerInput"
        >
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0"
            :class="isDragging ? 'bg-brand-yellow/15 shadow-sm' : 'bg-ink-800 border border-ink-700'"
          >
            <svg
              class="w-6 h-6 transition-colors"
              :class="isDragging ? 'text-brand-yellow' : 'text-zinc-500'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div class="flex flex-col items-center gap-2">
            <p class="text-zinc-200 text-sm font-semibold font-display">Drop workflow JSON here</p>
            <p class="text-brand-yellow text-xs font-semibold hover:text-white underline underline-offset-4 cursor-pointer">
              click to browse
            </p>
            <div class="flex items-center gap-1.5 text-zinc-500 text-xs">
              <kbd class="text-zinc-400 font-mono text-[10px] bg-ink-800 border border-ink-700 rounded-lg px-1.5 py-0.5 shadow-sm">Ctrl+V</kbd>
              <span>to paste</span>
            </div>
          </div>
          <span class="text-[10px] uppercase font-bold tracking-widest text-zinc-650 bg-ink-800 px-2 py-0.5 rounded border border-ink-700 font-mono shrink-0">JSON</span>
        </div>
        <p v-if="errorMsg" class="w-full text-red-400 text-xs text-center border border-red-950 bg-red-950/20 px-3 py-2 rounded-xl shrink-0">{{ errorMsg }}</p>
      </template>
    </div>

    <!-- Feature list -->
    <div class="px-6 py-6 border-b border-ink-800 flex flex-col gap-1.5">
      <div
        v-for="item in features"
        :key="item.label"
        class="flex items-start gap-3 px-3 py-2 -mx-3 rounded-xl border border-transparent hover:border-brand-yellow/15 hover:bg-brand-yellow/[0.04] transition-all duration-200 group select-none cursor-default"
      >
        <div class="mt-0.5 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:translate-x-0.5">
          <svg
            v-if="item.done"
            class="w-4 h-4 text-brand-yellow transition-all duration-200 filter drop-shadow-[0_0_1px_rgba(240,255,65,0.2)] group-hover:drop-shadow-[0_0_6px_rgba(240,255,65,0.8)]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else class="text-zinc-650 text-xs font-bold font-mono transition-colors group-hover:text-brand-yellow/60">○</span>
        </div>
        <div class="min-w-0 transition-transform duration-200 group-hover:translate-x-0.5">
          <span class="text-sm text-zinc-350 leading-tight block transition-colors group-hover:text-zinc-100 font-medium">{{ item.label }}</span>
          <span v-if="!item.done" class="text-[10px] text-zinc-500 font-semibold tracking-wide font-mono uppercase mt-0.5 block transition-colors group-hover:text-brand-yellow/70">Coming Soon</span>
        </div>
      </div>
    </div>

    <!-- Connection section -->
    <div class="px-6 py-5 bg-ink-900/20 flex flex-col gap-3.5">
      <!-- Header row with toggle -->
      <div class="flex items-center justify-between">
        <h2 class="panel-header">ComfyUI Server</h2>
        <button
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer"
          :class="serverEnabled ? 'bg-brand-yellow' : 'bg-ink-800'"
          @click="toggleServer"
          disabled
        >
          <span
            class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200"
            :class="serverEnabled ? 'translate-x-4.5' : 'translate-x-0.5'"
          />
        </button>
      </div>

      <!-- Connection form — only visible when enabled -->
      <template v-if="serverEnabled">
        <div class="flex gap-2">
          <input
            v-model="serverUrl"
            type="text"
            placeholder="http://localhost:8188"
            class="flex-1 min-w-0 text-sm bg-ink-800 border border-ink-700 focus:border-brand-yellow/50 rounded-xl px-3 py-2 text-zinc-200 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-brand-yellow/20 transition-all duration-200"
            @keydown.enter="emit('connect', serverUrl)"
          />
          <button
            class="px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all duration-200 whitespace-nowrap cursor-pointer"
            :class="props.schemaStatus === 'loading'
              ? 'bg-ink-850 border-ink-800 text-zinc-650 cursor-not-allowed'
              : 'bg-ink-800 hover:bg-ink-700 border-ink-700 hover:border-ink-600 text-zinc-300 hover:text-white'"
            :disabled="props.schemaStatus === 'loading'"
            @click="emit('connect', serverUrl)"
          >
            {{ props.schemaStatus === 'loading' ? '…' : 'Connect' }}
          </button>
        </div>
        <div class="flex items-center gap-1.5 min-h-[20px]">
          <template v-if="props.schemaStatus === 'loading'">
            <span class="text-xs text-zinc-500 animate-pulse">Connecting to server…</span>
          </template>
          <template v-else-if="props.schemaStatus === 'connected'">
            <span class="w-2 h-2 rounded-full bg-brand-yellow flex-shrink-0 animate-ping absolute" />
            <span class="w-2 h-2 rounded-full bg-brand-yellow flex-shrink-0 relative" />
            <span class="text-xs font-medium text-brand-yellow">Connected · {{ props.schemaNodeCount }} nodes</span>
          </template>
          <template v-else-if="props.schemaStatus === 'cached'">
            <span class="w-1.5 h-1.5 rounded-full bg-plum-400 flex-shrink-0" />
            <span class="text-xs text-plum-300 leading-relaxed">
              Cached · {{ props.schemaNodeCount }} nodes · {{ props.cachedAt ? formatCachedAt(props.cachedAt) : '' }}
            </span>
          </template>
          <template v-else-if="props.schemaStatus === 'error'">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            <span class="text-xs text-red-400 leading-normal">Failed — check local server & CORS settings</span>
          </template>
        </div>
      </template>
      <div v-else class="flex items-center gap-1.5 min-h-[20px]">
        <template v-if="props.cachedAt">
          <span class="w-1.5 h-1.5 rounded-full bg-plum-500/80 flex-shrink-0" />
          <span class="text-xs text-plum-300/90 font-medium">Cached · {{ props.schemaNodeCount }} nodes · {{ formatCachedAt(props.cachedAt) }}</span>
        </template>
        <span v-else class="text-xs text-zinc-500">Off — static analysis only for now, dynamic analysis is coming.</span>
      </div>
    </div>

    <input
      ref="fileInputEl"
      type="file"
      accept=".json,application/json,text/plain"
      class="hidden"
      @change="onFileInput"
    />
  </div>
</template>

