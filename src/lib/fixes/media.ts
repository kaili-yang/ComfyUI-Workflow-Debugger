import type { GraphWorkflow } from '../../types/workflow'
import { isLikelyStaleRef } from '../shared/stale-ref'

const MEDIA_LOADERS: Record<string, string> = {
  LoadImage: '512x512.webp',
  LoadAudio: '5s.mp3',
  VHS_LoadVideo: 'video 15s.mp4',
  VHS_LoadVideoPath: 'video 15s.mp4',
}

export function fixStaleMediaRefs(workflow: GraphWorkflow): { changes: number; substituted: Set<string> } {
  let changes = 0
  const substituted = new Set<string>()

  for (const node of workflow.nodes) {
    const testFile = MEDIA_LOADERS[node.type]
    if (!testFile) continue

    const wv: unknown = node.widgets_values

    if (Array.isArray(wv)) {
      if (typeof wv[0] === 'string' && isLikelyStaleRef(wv[0])) {
        wv[0] = testFile
        substituted.add(testFile)
        changes++
      }
    } else if (wv && typeof wv === 'object') {
      const vidObj = wv as Record<string, unknown>
      if (typeof vidObj['video'] === 'string' && isLikelyStaleRef(vidObj['video'])) {
        vidObj['video'] = testFile
        const preview = vidObj['videopreview']
        if (preview && typeof preview === 'object' && !Array.isArray(preview)) {
          const params = (preview as Record<string, unknown>)['params']
          if (params && typeof params === 'object' && !Array.isArray(params)) {
            const p = params as Record<string, unknown>
            p['filename'] = testFile
            p['format'] = 'video/mp4'
          }
        }
        substituted.add(testFile)
        changes++
      }
    }
  }

  return { changes, substituted }
}
