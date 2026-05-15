import { ref } from 'vue'

export function useWorkflowFile() {
  const fileName = ref<string | null>(null)
  const rawContent = ref<string | null>(null)

  function onFileLoaded(name: string, content: string): void {
    fileName.value = name
    rawContent.value = content
  }

  function reset(): void {
    fileName.value = null
    rawContent.value = null
  }

  return { fileName, rawContent, onFileLoaded, reset }
}
