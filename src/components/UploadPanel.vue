<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  fileName: string | null
  schemaStatus: 'idle' | 'loading' | 'connected' | 'error'
  schemaNodeCount: number
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
  { label: 'Improvement suggestions per node', done: false },
  { label: 'Node performance profiling', done: false },
  { label: 'Auto-fix common errors', done: true },
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

onMounted(() => document.addEventListener('paste', onPaste))
onUnmounted(() => document.removeEventListener('paste', onPaste))
</script>

<template>
  <div class="flex flex-col h-full bg-gray-950">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 border-b border-gray-800 flex items-start justify-between">
      <div>
        <p class="text-sm font-bold text-gray-100 tracking-tight">Workflow Debugger</p>
        <p class="text-xs text-gray-600 mt-0.5">ComfyUI · Offline Analysis</p>
      </div>
      <a
        href="https://github.com/kaili-yang/ComfyUI-Workflow-Debugger"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-0.5 text-gray-600 hover:text-gray-300 transition-colors"
        title="View on GitHub"
      >
        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
    </div>

    <!-- Feature list -->
    <div class="flex-shrink-0 px-4 py-3 border-b border-gray-800 flex flex-col gap-2">
      <div v-for="item in features" :key="item.label" class="flex items-start gap-2.5">
        <span class="mt-0.5 text-xs shrink-0" :class="item.done ? 'text-green-400' : 'text-gray-600'">
          {{ item.done ? '✓' : '○' }}
        </span>
        <div class="min-w-0">
          <span class="text-xs text-gray-300">{{ item.label }}</span>
          <span v-if="!item.done" class="ml-1.5 text-[10px] text-gray-600 font-mono">coming soon</span>
        </div>
      </div>
    </div>

    <!-- Connection section -->
    <div class="flex-shrink-0 px-4 py-3 border-b border-gray-800">
      <!-- Header row with toggle -->
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">ComfyUI Server</p>
        <button
          class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 focus:outline-none"
          :class="serverEnabled ? 'bg-green-500' : 'bg-gray-600'"
          @click="toggleServer"
        >
          <span
            class="inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200"
            :class="serverEnabled ? 'translate-x-3.5' : 'translate-x-0.5'"
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
            class="flex-1 min-w-0 text-xs bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            @keydown.enter="emit('connect', serverUrl)"
          />
          <button
            class="px-2.5 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap"
            :class="props.schemaStatus === 'loading'
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-600 text-gray-300'"
            :disabled="props.schemaStatus === 'loading'"
            @click="emit('connect', serverUrl)"
          >
            {{ props.schemaStatus === 'loading' ? '…' : 'Connect' }}
          </button>
        </div>
        <div class="flex items-center gap-1.5 mt-2 min-h-[16px]">
          <template v-if="props.schemaStatus === 'loading'">
            <span class="text-xs text-gray-500">Connecting…</span>
          </template>
          <template v-else-if="props.schemaStatus === 'connected'">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            <span class="text-xs text-green-400">Connected · {{ props.schemaNodeCount }} nodes</span>
          </template>
          <template v-else-if="props.schemaStatus === 'error'">
            <span class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            <span class="text-xs text-red-400">Connection failed — check the URL and CORS</span>
          </template>
        </div>
      </template>
      <p v-else class="text-xs text-gray-600">Off — static analysis only</p>
    </div>

    <!-- Body -->
    <div class="flex-1 flex flex-col items-stretch justify-center px-4 py-5 gap-3 min-h-0">

      <!-- File loaded state -->
      <template v-if="props.fileName">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div class="w-9 h-9 bg-green-500/10 border border-green-700/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-gray-300 text-xs font-mono break-all leading-relaxed">{{ props.fileName }}</p>
        </div>
        <button
          class="py-2 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
          @click="triggerInput"
        >
          Upload another
        </button>
        <button
          class="py-2 text-xs text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-800/40 rounded-lg transition-colors"
          @click="emit('reset')"
        >
          Clear
        </button>
      </template>

      <!-- Upload state -->
      <template v-else>
        <div
          class="flex-1 min-h-0 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 select-none"
          :class="isDragging
            ? 'border-blue-400 bg-blue-950/20'
            : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900'"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="triggerInput"
        >
          <div
            class="w-11 h-11 rounded-full flex items-center justify-center transition-colors"
            :class="isDragging ? 'bg-blue-500/20' : 'bg-gray-800'"
          >
            <svg
              class="w-5 h-5 transition-colors"
              :class="isDragging ? 'text-blue-400' : 'text-gray-500'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div class="text-center px-4">
            <p class="text-gray-200 text-sm font-medium">Drop workflow JSON here</p>
            <p class="text-gray-600 text-xs mt-1">
              <span class="text-blue-400 underline underline-offset-2 cursor-pointer">click to browse</span>
              <span class="mx-1">·</span>
              <kbd class="text-gray-500 font-mono text-[10px] bg-gray-800 border border-gray-700 rounded px-1 py-0.5">Ctrl+V</kbd>
              <span class="text-gray-700"> to paste</span>
            </p>
          </div>
          <p class="text-gray-700 text-xs">.json</p>
        </div>
        <p v-if="errorMsg" class="text-red-400 text-xs text-center">{{ errorMsg }}</p>
      </template>

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
