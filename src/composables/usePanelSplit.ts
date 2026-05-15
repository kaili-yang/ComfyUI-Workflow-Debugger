import { onMounted, onUnmounted, ref } from 'vue'

export function usePanelSplit(storageKey: string) {
  const topHeightPct = ref(Number(localStorage.getItem(storageKey)) || 60)
  let isDragging = false
  let dragStartY = 0
  let dragStartPct = 0

  function onDividerMousedown(e: MouseEvent): void {
    isDragging = true
    dragStartY = e.clientY
    dragStartPct = topHeightPct.value
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  function onDocMousemove(e: MouseEvent): void {
    if (!isDragging) return
    const containerH = document.documentElement.clientHeight
    const deltaY = e.clientY - dragStartY
    const deltaPct = (deltaY / containerH) * 100
    topHeightPct.value = Math.min(85, Math.max(15, dragStartPct + deltaPct))
  }

  function onDocMouseup(): void {
    if (!isDragging) return
    isDragging = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem(storageKey, String(Math.round(topHeightPct.value)))
  }

  onMounted(() => {
    document.addEventListener('mousemove', onDocMousemove)
    document.addEventListener('mouseup', onDocMouseup)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', onDocMousemove)
    document.removeEventListener('mouseup', onDocMouseup)
  })

  return { topHeightPct, onDividerMousedown }
}
