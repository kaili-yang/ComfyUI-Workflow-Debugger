import type { WorkflowLink, WorkflowNode } from '../../types/workflow'

export function applyFallbackLayout(ns: WorkflowNode[], ls: WorkflowLink[]): void {
  const inDeg = new Map<number, number>()
  const adj = new Map<number, number[]>()
  for (const n of ns) { inDeg.set(n.id, 0); adj.set(n.id, []) }
  for (const l of ls) {
    adj.get(l.fromNodeId)?.push(l.toNodeId)
    inDeg.set(l.toNodeId, (inDeg.get(l.toNodeId) ?? 0) + 1)
  }

  const columns: number[][] = []
  let queue = ns.filter((n) => (inDeg.get(n.id) ?? 0) === 0).map((n) => n.id)
  if (!queue.length && ns.length) queue = [ns[0].id]

  const visited = new Set<number>()
  while (queue.length) {
    columns.push([...queue])
    const next: number[] = []
    for (const id of queue) {
      visited.add(id)
      for (const nb of adj.get(id) ?? []) {
        const d = (inDeg.get(nb) ?? 0) - 1
        inDeg.set(nb, d)
        if (d === 0 && !visited.has(nb)) next.push(nb)
      }
    }
    queue = next
  }
  const unvisited = ns.filter((n) => !visited.has(n.id))
  if (unvisited.length) columns.push(unvisited.map((n) => n.id))

  const nodeMap = new Map(ns.map((n) => [n.id, n]))
  columns.forEach((col, ci) => {
    col.forEach((id, ri) => {
      const n = nodeMap.get(id)
      if (!n) return
      if (!n.pos) n.pos = [ci * 280, ri * 160] as [number, number]
      if (!n.size) n.size = [210, 80] as [number, number]
    })
  })
}
