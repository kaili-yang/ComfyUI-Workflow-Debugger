<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  fileName: string | null
}>()

const emit = defineEmits<{
  fileLoaded: [name: string, content: string]
  reset: []
}>()

const features = [
  { label: 'No model downloads required — runs offline', done: true },
  { label: 'Detect broken links & missing nodes', done: true },
  { label: 'Type mismatch & cycle detection', done: true },
  { label: 'Visual node graph with error highlights', done: true },
  { label: 'Improvement suggestions per node', done: false },
  { label: 'Node performance profiling', done: false },
  { label: 'Auto-fix common errors', done: false },
]

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
</script>

<template>
  <div class="flex flex-col h-full bg-gray-950">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 border-b border-gray-800">
      <p class="text-sm font-bold text-gray-100 tracking-tight">Workflow Debugger</p>
      <p class="text-xs text-gray-600 mt-0.5">ComfyUI · Offline Analysis</p>
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
            <p class="text-gray-600 text-xs mt-1">or <span class="text-blue-400 underline underline-offset-2">click to browse</span></p>
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
