<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { AnalysisResult, GraphWorkflow, SlotType, WorkflowLink, WorkflowNode } from '../types/workflow'
import { applyFallbackLayout } from '../lib/shared/graph-layout'

const renderError = ref<string | null>(null)

const props = defineProps<{
  workflow: GraphWorkflow | null
  result: AnalysisResult | null
  fileName: string | null
  selectedNodeId: number | null
  fixedNodeIds?: Set<number>
  fixedLinkIds?: Set<number>
}>()

const emit = defineEmits<{ nodeSelect: [id: number | null] }>()

// ─── Refs ────────────────────────────────────────────────────────────────────

const containerEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const cursorStyle = ref<'grab' | 'grabbing'>('grab')
const isFullscreen = ref(false)

// ─── Camera ──────────────────────────────────────────────────────────────────

// camera.x/y = world-space center the viewport is locked on
// zoom = CSS px per world unit
const camera = { x: 0, y: 0, zoom: 1 }
let dirty = true

// ─── Scene data ──────────────────────────────────────────────────────────────

let nodes: WorkflowNode[] = []
let links: WorkflowLink[] = []

// ─── Animation ───────────────────────────────────────────────────────────────

let animId = 0
let resizeObserver: ResizeObserver

// ─── Pan ─────────────────────────────────────────────────────────────────────

let panning = false
let panLastX = 0
let panLastY = 0
let panDistance = 0
let lastEmittedNodeId: number | null = null

// ─── LiteGraph constants (matching ComfyUI source) ───────────────────────────
// node.pos[1] = top of BODY; title bar is above at pos[1] - TITLE_H
// slot Y = pos[1] + (slotIndex + 0.7) * SLOT_H
// input  X = pos[0] + SLOT_H * 0.5          (= pos[0] + 10)
// output X = pos[0] + size[0] - SLOT_H * 0.5 + 1  (≈ pos[0] + size[0] - 9)

const TITLE_H = 30
const SLOT_H = 20
const SLOT_DOT = 5      // slot circle radius
const ROUND_R = 8

// Default node colors from LiteGraph
// C_BODY / C_TITLE kept for reference but individual drawNode uses per-severity colors
const C_TEXT = '#cccccc'
const C_TITLE_TEXT = '#eeeeee'
const C_BG = '#151317'

const TYPE_COLORS: Record<string, string> = {
  MODEL: '#c084fc',
  CLIP: '#ffe58f',
  VAE: '#ff8a65',
  LATENT: '#80deea',
  IMAGE: '#a5d6a7',
  MASK: '#d4d4d4',
  CONDITIONING: '#ff8a65',
  CONTROL_NET: '#a78bfa',
  INT: '#90caf9',
  FLOAT: '#90caf9',
  STRING: '#b0bec5',
}

function slotColor(type: SlotType | undefined | null): string {
  if (type == null) return '#64748b'
  const key = String(type).toUpperCase()
  return TYPE_COLORS[key] ?? '#64748b'
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

function nodeW(n: WorkflowNode): number {
  return n.size?.[0] ?? 200
}

function nodeH(n: WorkflowNode): number {
  return n.size?.[1] ?? 80
}

function slotY(node: WorkflowNode, i: number): number {
  return node.pos![1] + (i + 0.7) * SLOT_H
}

function inputX(node: WorkflowNode): number {
  return node.pos![0] + SLOT_H * 0.5   // + 10
}

function outputX(node: WorkflowNode): number {
  return node.pos![0] + nodeW(node) - SLOT_H * 0.5 + 1  // - 9
}

// ─── Severity ────────────────────────────────────────────────────────────────

function severity(id: number): 'error' | 'warning' | 'ok' {
  if (!props.result) return 'ok'
  const issues = props.result.issues.filter((i) => i.nodeId === id)
  if (issues.some((i) => i.severity === 'error')) return 'error'
  if (issues.some((i) => i.severity === 'warning')) return 'warning'
  return 'ok'
}

// ─── Camera fit ──────────────────────────────────────────────────────────────

function fitCamera(): void {
  const canvas = canvasEl.value
  if (!canvas || !nodes.length) return
  const hasPosNodes = nodes.filter((n) => n.pos)
  if (!hasPosNodes.length) return

  const PAD = 80
  const minX = Math.min(...hasPosNodes.map((n) => n.pos![0])) - PAD
  const maxX = Math.max(...hasPosNodes.map((n) => n.pos![0] + nodeW(n))) + PAD
  // include title bar height above pos[1]
  const minY = Math.min(...hasPosNodes.map((n) => n.pos![1] - TITLE_H)) - PAD
  const maxY = Math.max(...hasPosNodes.map((n) => n.pos![1] + nodeH(n))) + PAD

  const cw = canvas.width / (window.devicePixelRatio || 1)
  const ch = canvas.height / (window.devicePixelRatio || 1)
  if (cw === 0 || ch === 0) return

  camera.zoom = Math.min(cw / (maxX - minX), ch / (maxY - minY), 2)
  camera.x = (minX + maxX) / 2
  camera.y = (minY + maxY) / 2
  dirty = true
}

// ─── Build scene ─────────────────────────────────────────────────────────────

function buildScene(fit = true): void {
  renderError.value = null

  if (!props.workflow) {
    nodes = []
    links = []
    dirty = true
    return
  }

  try {
    // Deep-clone so mutations (fallback layout) don't affect props
    nodes = props.workflow.nodes.map((n) => ({
      ...n,
      pos: n.pos ? ([...n.pos] as [number, number]) : undefined,
      size: n.size ? ([...n.size] as [number, number]) : undefined,
    }))

    links = props.workflow.links.map((r) => ({
      id: r[0], fromNodeId: r[1], fromSlot: r[2],
      toNodeId: r[3], toSlot: r[4], type: r[5],
    }))

    // Always ensure every node has valid pos + size so all nodes render,
    // even in broken workflows where some nodes might be missing layout data.
    applyFallbackLayout(nodes, links)

    if (fit) {
      fitCamera()
    }
  } catch (err) {
    renderError.value = err instanceof Error ? err.message : String(err)
    nodes = []
    links = []
    dirty = true
  }
}

// ─── Render ──────────────────────────────────────────────────────────────────

function drawError(ctx: CanvasRenderingContext2D, lw: number, lh: number, msg: string): void {
  ctx.fillStyle = '#1a0a0a'
  ctx.fillRect(0, 0, lw, lh)

  const boxW = Math.min(lw - 40, 520)
  const boxH = 100
  const bx = (lw - boxW) / 2
  const by = (lh - boxH) / 2

  ctx.fillStyle = '#2a0f0f'
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(bx, by, boxW, boxH, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#fca5a5'
  ctx.font = 'bold 13px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Render error', lw / 2, by + 24)

  ctx.fillStyle = '#d1d5db'
  ctx.font = '11px monospace'
  const words = msg.split(' ')
  let line = ''
  let lineY = by + 50
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > boxW - 24) {
      ctx.fillText(line, lw / 2, lineY, boxW - 24)
      line = word
      lineY += 16
      if (lineY > by + boxH - 10) break
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, lw / 2, lineY, boxW - 24)
}

function render(): void {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const lw = canvas.width / dpr   // logical width
  const lh = canvas.height / dpr  // logical height

  ctx.save()
  ctx.scale(dpr, dpr)

  // ── Background ──
  ctx.fillStyle = C_BG
  ctx.fillRect(0, 0, lw, lh)

  // ── Show build/parse error ──
  if (renderError.value) {
    drawError(ctx, lw, lh, renderError.value)
    ctx.restore()
    return
  }

  if (!nodes.length) {
    ctx.restore()
    return
  }

  try {
    // ── World transform: centre viewport on camera.x / camera.y ──
    ctx.translate(lw / 2 - camera.x * camera.zoom, lh / 2 - camera.y * camera.zoom)
    ctx.scale(camera.zoom, camera.zoom)

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // ── Links (drawn below nodes) ──
    ctx.lineCap = 'round'
    for (const link of links) {
      if (props.fixedLinkIds?.has(link.id)) continue   // drawn in second pass
      const from = nodeMap.get(link.fromNodeId)
      const to   = nodeMap.get(link.toNodeId)
      if (!from?.pos || !to?.pos) continue

      const x1 = outputX(from)
      const y1 = slotY(from, link.fromSlot)
      const x2 = inputX(to)
      const y2 = slotY(to, link.toSlot)
      const dx = Math.abs(x2 - x1) * 0.5

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2)
      ctx.strokeStyle = slotColor(link.type)
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.75
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // ── Fixed links: animated marching-ants + pulsing glow ──
    const t = Date.now() / 1000
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5)   // 0→1 at ~2.5 Hz

    for (const link of links) {
      if (!props.fixedLinkIds?.has(link.id)) continue
      const from = nodeMap.get(link.fromNodeId)
      const to   = nodeMap.get(link.toNodeId)
      if (!from?.pos || !to?.pos) continue

      const x1 = outputX(from)
      const y1 = slotY(from, link.fromSlot)
      const x2 = inputX(to)
      const y2 = slotY(to, link.toSlot)
      const dx = Math.abs(x2 - x1) * 0.5

      const path = new Path2D()
      path.moveTo(x1, y1)
      path.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2)

      // Wide pulsing glow halo
      ctx.shadowColor = '#f0ff41'
      ctx.shadowBlur = 10 + 20 * pulse
      ctx.strokeStyle = '#f0ff41'
      ctx.lineWidth = 10
      ctx.globalAlpha = 0.15 + 0.2 * pulse
      ctx.stroke(path)

      // Solid base line
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#f0ff41'
      ctx.lineWidth = 3.5
      ctx.globalAlpha = 1
      ctx.setLineDash([])
      ctx.stroke(path)

      // Marching-ants overlay (white dashes flowing forward)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.7
      ctx.setLineDash([8, 10])
      ctx.lineDashOffset = -(t * 35) % 18
      ctx.stroke(path)

      ctx.setLineDash([])
      ctx.lineDashOffset = 0
      ctx.globalAlpha = 1
      ctx.shadowColor = 'transparent'
    }

    // ── Nodes ──
    for (const node of nodes) {
      if (!node.pos) continue
      drawNode(ctx, node)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    renderError.value = msg
    ctx.restore()
    dirty = true
    return
  }

  ctx.restore()
}

function drawNode(ctx: CanvasRenderingContext2D, node: WorkflowNode): void {
  const x   = node.pos![0]
  const y   = node.pos![1]   // body top
  const w   = nodeW(node)
  const h   = nodeH(node)
  const s   = severity(node.id)
  const muted = node.mode !== undefined && node.mode !== 0
  const isNew = props.fixedNodeIds?.has(node.id) ?? false

  // Title bar color
  const titleColor = isNew          ? '#343808'
    : s === 'error'   ? '#581c24'
    : s === 'warning' ? '#422006'
    : muted           ? '#27272a'
    : '#222225'

  // Body color
  const bodyColor = isNew           ? '#161703'
    : s === 'error'   ? '#1b0e11'
    : s === 'warning' ? '#181102'
    : muted           ? '#121214'
    : '#0c0c0e'

  // Border color + width
  const borderColor = isNew         ? '#f0ff41'
    : s === 'error'   ? '#f43f5e'
    : s === 'warning' ? '#ff9f29'
    : muted           ? '#3f3f46'
    : '#2e2e33'

  const borderWidth = isNew ? 2.5 : s === 'error' ? 2.5 : s === 'warning' ? 2 : 1.5

  // ── Drop shadow ──
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 3

  // ── Full node shape (body + title area) ──
  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.roundRect(x, y - TITLE_H, w, h + TITLE_H, ROUND_R)
  ctx.fill()

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0

  // ── Title bar overlay ──
  ctx.fillStyle = titleColor
  ctx.beginPath()
  ctx.roundRect(x, y - TITLE_H, w, TITLE_H, [ROUND_R, ROUND_R, 0, 0])
  ctx.fill()

  // ── Body / title separator ──
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke()

  // ── Status border — always drawn for every node ──
  if (isNew) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400)
    ctx.shadowColor = '#f0ff41'
    ctx.shadowBlur = 8 + 18 * pulse
    ctx.strokeStyle = '#f0ff41'
    ctx.lineWidth = borderWidth + 1.5 * pulse
    // Extra outer glow ring
    ctx.globalAlpha = 0.3 + 0.3 * pulse
    ctx.beginPath()
    ctx.roundRect(x - 4, y - TITLE_H - 4, w + 8, h + TITLE_H + 8, ROUND_R + 3)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  ctx.strokeStyle = borderColor
  ctx.lineWidth = borderWidth
  ctx.shadowColor = isNew ? '#f0ff41' : 'transparent'
  ctx.shadowBlur = isNew ? 8 : 0
  ctx.beginPath()
  ctx.roundRect(x - 1, y - TITLE_H - 1, w + 2, h + TITLE_H + 2, ROUND_R + 1)
  ctx.stroke()
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // ── Selection ring ──
  if (node.id === props.selectedNodeId) {
    ctx.strokeStyle = '#f0ff41'  // brand yellow
    ctx.lineWidth = 2.5
    ctx.shadowColor = '#f0ff41'  // brand yellow glow
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.roundRect(x - 4, y - TITLE_H - 4, w + 8, h + TITLE_H + 8, ROUND_R + 3)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // ── Title text ──
  ctx.fillStyle = C_TITLE_TEXT
  ctx.font = 'bold 12px Outfit, Inter, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(node.type, x + 8, y - TITLE_H / 2, w - 36)

  // Status icon + node ID (right side of title)
  const statusIcon = s === 'error' ? '✕' : s === 'warning' ? '⚠' : '✓'
  const iconColor  = s === 'error' ? '#fca5a5' : s === 'warning' ? '#fcd34d' : '#86efac'
  ctx.font = 'bold 11px system-ui'
  ctx.textAlign = 'right'
  ctx.fillStyle = iconColor
  ctx.fillText(statusIcon, x + w - 6, y - TITLE_H / 2)

  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '10px monospace'
  ctx.fillText(`#${node.id}`, x + w - 20, y - TITLE_H / 2)

  // Muted/bypassed label
  if (muted) {
    ctx.fillStyle = '#fcd34d'
    ctx.font = 'bold 10px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(node.mode === 2 ? 'MUTED' : 'BYPASSED', x + w / 2, y - TITLE_H / 2)
  }

  // New node badge
  if (isNew) {
    const badgeText = 'NEW'
    ctx.font = 'bold 9px system-ui'
    const bw = ctx.measureText(badgeText).width + 8
    const bx = x + 4
    const by = y - TITLE_H + 4
    ctx.fillStyle = '#f0ff41'
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, 13, 3)
    ctx.fill()
    ctx.fillStyle = '#151317'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(badgeText, bx + bw / 2, by + 6.5)
  }

  // ── Input slots ──
  const inputs = node.inputs ?? []
  inputs.forEach((inp, i) => {
    const sx = inputX(node)
    const sy = slotY(node, i)
    const connected = inp.link !== null && inp.link !== undefined
    const color = slotColor(inp.type)

    // Slot circle: filled if connected, hollow if not
    ctx.beginPath()
    ctx.arc(sx, sy, SLOT_DOT, 0, Math.PI * 2)
    if (connected) {
      ctx.fillStyle = color
      ctx.fill()
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Slot label
    ctx.fillStyle = C_TEXT
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(inp.name, sx + 10, sy, w / 2 - 14)
  })

  // ── Output slots ──
  const outputs = node.outputs ?? []
  outputs.forEach((out, i) => {
    const sx = outputX(node)
    const sy = slotY(node, i)
    const color = slotColor(out.type)

    ctx.beginPath()
    ctx.arc(sx, sy, SLOT_DOT, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    ctx.fillStyle = C_TEXT
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(out.name, sx - 10, sy, w / 2 - 14)
  })
}

// ─── Canvas setup ────────────────────────────────────────────────────────────

function sizeCanvas(w: number, h: number): void {
  const canvas = canvasEl.value!
  const dpr = window.devicePixelRatio || 1
  canvas.width  = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
}

// ─── Zoom / fit / fullscreen controls ────────────────────────────────────────

function zoomIn(): void  { camera.zoom = Math.min(4, camera.zoom * 1.3); dirty = true }
function zoomOut(): void { camera.zoom = Math.max(0.05, camera.zoom / 1.3); dirty = true }
function fitAll(): void  { fitCamera() }

function toggleFullscreen(): void {
  if (!containerEl.value) return
  document.fullscreenElement
    ? document.exitFullscreen().catch(() => {})
    : containerEl.value.requestFullscreen().catch(() => {})
}

function onFullscreenChange(): void {
  isFullscreen.value = !!document.fullscreenElement
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => {
  const canvas = canvasEl.value!
  const container = containerEl.value!

  // Initial size
  sizeCanvas(container.clientWidth || 800, container.clientHeight || 600)

  // Resize observer keeps canvas buffer in sync
  resizeObserver = new ResizeObserver(([entry]) => {
    const { width: w, height: h } = entry.contentRect
    if (w > 0 && h > 0) {
      sizeCanvas(w, h)
      dirty = true
    }
  })
  resizeObserver.observe(container)

  // ── Hit test ──
  function hitTestNode(e: MouseEvent): WorkflowNode | null {
    const dpr = window.devicePixelRatio || 1
    const lw = canvas.width / dpr
    const lh = canvas.height / dpr
    const rect = canvas.getBoundingClientRect()
    const worldX = (e.clientX - rect.left - lw / 2) / camera.zoom + camera.x
    const worldY = (e.clientY - rect.top  - lh / 2) / camera.zoom + camera.y
    for (const node of nodes) {
      if (!node.pos) continue
      if (worldX >= node.pos[0] && worldX <= node.pos[0] + nodeW(node)
        && worldY >= node.pos[1] - TITLE_H && worldY <= node.pos[1] + nodeH(node)) {
        return node
      }
    }
    return null
  }

  // ── Pan ──
  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return
    panning = true
    panDistance = 0
    cursorStyle.value = 'grabbing'
    panLastX = e.clientX
    panLastY = e.clientY
  })
  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    if (!panning) return
    const dx = e.clientX - panLastX
    const dy = e.clientY - panLastY
    panDistance += Math.abs(dx) + Math.abs(dy)
    camera.x -= dx / camera.zoom
    camera.y -= dy / camera.zoom
    panLastX = e.clientX
    panLastY = e.clientY
    dirty = true
  })
  canvas.addEventListener('mouseup', (e: MouseEvent) => {
    if (!panning) return
    panning = false
    cursorStyle.value = 'grab'
    if (panDistance < 4) {
      const node = hitTestNode(e)
      const id = node?.id ?? null
      lastEmittedNodeId = id
      emit('nodeSelect', id)
    }
  })
  canvas.addEventListener('mouseleave', () => { panning = false; cursorStyle.value = 'grab' })

  // ── Zoom (centered on cursor) ──
  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault()
    const dpr = window.devicePixelRatio || 1
    const lw = canvas.width / dpr
    const lh = canvas.height / dpr

    const rect   = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Mouse position in world space before zoom
    const wx = (mouseX - lw / 2) / camera.zoom + camera.x
    const wy = (mouseY - lh / 2) / camera.zoom + camera.y

    const factor   = e.deltaY > 0 ? 0.9 : 1.1
    camera.zoom    = Math.max(0.05, Math.min(4, camera.zoom * factor))

    // Adjust so the point under cursor stays fixed
    camera.x = wx - (mouseX - lw / 2) / camera.zoom
    camera.y = wy - (mouseY - lh / 2) / camera.zoom

    dirty = true
  }, { passive: false })

  // ── Fullscreen ──
  document.addEventListener('fullscreenchange', onFullscreenChange)

  // ── Build initial scene ──
  buildScene()

  // ── Render loop: always dirty when animated elements are present ──
  function frame(): void {
    animId = requestAnimationFrame(frame)
    const hasAnim = (props.fixedNodeIds?.size ?? 0) > 0 || (props.fixedLinkIds?.size ?? 0) > 0
    if (hasAnim) dirty = true
    if (dirty) { render(); dirty = false }
  }
  frame()
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  resizeObserver?.disconnect()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

// Workflow changed: rebuild scene from scratch but do NOT auto-fit camera.
watch(() => props.workflow, () => {
  buildScene(false)
})

// File name changed: a new file was uploaded, auto-fit camera.
watch(() => props.fileName, (newVal) => {
  if (newVal) {
    fitCamera()
  }
})

// Only analysis result changed (e.g. server schema connected/disconnected):
// severity colors update without rebuilding the scene or resetting the camera.
watch(() => props.result, () => {
  dirty = true
})

watch(() => [props.fixedNodeIds, props.fixedLinkIds] as const, () => {
  dirty = true
})

watch(() => props.selectedNodeId, (newId) => {
  if (newId === null || newId === lastEmittedNodeId) return
  const node = nodes.find((n) => n.id === newId)
  if (!node?.pos) return
  camera.x = node.pos[0] + nodeW(node) / 2
  camera.y = node.pos[1] + (nodeH(node) - TITLE_H) / 2
  dirty = true
})
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full overflow-hidden">
    <canvas
      ref="canvasEl"
      class="block w-full h-full"
      :style="{ cursor: cursorStyle }"
    />

    <!-- Floating Step 2 Title -->
    <div class="step-title step-title-absolute">
      Step 2: Workflow Preview
    </div>

    <!-- Empty state overlay -->
    <div
      v-if="!workflow"
      class="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-ink-900/20 pointer-events-none select-none z-10 px-6"
    >
      <p class="text-zinc-650 text-sm font-semibold tracking-wide font-display">Upload a workflow to visualize it</p>
      <div class="w-full max-w-md rounded-xl border border-ink-700/70 bg-ink-900/60 p-2 shadow-lg opacity-80">
        <img
          src="/workflow-minimap.svg"
          alt="Example workflow minimap preview"
          class="w-full h-auto rounded-lg opacity-90"
          draggable="false"
        />
        <p class="mt-2 text-center text-[11px] text-zinc-600 font-medium tracking-wide">
          Your node graph will appear here — like a ComfyUI minimap
        </p>
      </div>
    </div>

    <!-- Render error banner -->
    <div
      v-if="renderError"
      class="absolute bottom-2 left-2 right-16 flex items-start gap-2 bg-red-950/95 border border-red-500 rounded-lg px-3 py-2 text-sm select-text"
    >
      <span class="text-red-400 font-bold shrink-0 mt-0.5">ERR</span>
      <span class="text-red-200 break-all font-mono text-xs leading-relaxed">{{ renderError }}</span>
      <button
        class="ml-auto shrink-0 text-red-400 hover:text-red-200 transition-colors text-lg leading-none"
        title="Dismiss"
        @click="renderError = null"
      >×</button>
    </div>

    <!-- Overlay controls -->
    <div class="absolute top-3.5 right-3.5 flex gap-2 z-10 select-none">
      <!-- Zoom bar -->
      <div class="flex divide-x divide-ink-700 bg-ink-900/80 backdrop-blur border border-ink-700/60 rounded-xl overflow-hidden shadow-lg">
        <button
          class="px-3.5 py-2 text-zinc-400 hover:text-brand-yellow hover:bg-ink-800/50 transition-colors text-sm font-mono font-bold leading-none cursor-pointer"
          title="Zoom out"
          @click="zoomOut"
        >−</button>
        <button
          class="px-3 py-2 text-zinc-400 hover:text-brand-yellow hover:bg-ink-800/50 transition-colors cursor-pointer"
          title="Fit all nodes"
          @click="fitAll"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          class="px-3.5 py-2 text-zinc-400 hover:text-brand-yellow hover:bg-ink-800/50 transition-colors text-sm font-mono font-bold leading-none cursor-pointer"
          title="Zoom in"
          @click="zoomIn"
        >+</button>
      </div>

      <!-- Fullscreen toggle -->
      <button
        class="px-3 py-2 bg-ink-900/80 backdrop-blur border border-ink-700/60 rounded-xl text-zinc-400 hover:text-brand-yellow hover:bg-ink-800/50 transition-colors shadow-lg cursor-pointer"
        :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
        @click="toggleFullscreen"
      >
        <svg v-if="!isFullscreen" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
        </svg>
      </button>
    </div>
  </div>
</template>
