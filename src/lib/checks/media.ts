import type { Issue } from '../../types/workflow'
import type { GraphAnalysisContext } from '../shared/graph-context'
import { isLikelyStaleRef } from '../shared/stale-ref'

const MEDIA_TEST_FILES: Record<string, string> = {
  LoadImage: '512x512.webp',
  LoadAudio: '5s.mp3',
  VHS_LoadVideo: 'video 15s.mp4',
  VHS_LoadVideoPath: 'video 15s.mp4',
}

export function checkMediaRefs(ctx: GraphAnalysisContext): Issue[] {
  const { workflow } = ctx
  const issues: Issue[] = []

  for (const node of workflow.nodes) {
    const testFile = MEDIA_TEST_FILES[node.type]
    if (!testFile) continue

    const wv: unknown = node.widgets_values
    let fileRef: string | null = null

    if (Array.isArray(wv) && typeof wv[0] === 'string') {
      fileRef = wv[0]
    } else if (wv && typeof wv === 'object' && !Array.isArray(wv)) {
      const obj = wv as Record<string, unknown>
      if (typeof obj['video'] === 'string') fileRef = obj['video']
    }

    if (fileRef !== null && isLikelyStaleRef(fileRef)) {
      issues.push({
        severity: 'warning',
        nodeId: node.id,
        nodeType: node.type,
        message: `${node.type} (id: ${node.id}) references a file that may not exist: "${fileRef || '(empty)'}"`,
        suggestion: `Will be substituted with test data file: "${testFile}"`,
        fixable: true,
        fixType: 'stale-media-ref',
      })
    }
  }

  return issues
}
