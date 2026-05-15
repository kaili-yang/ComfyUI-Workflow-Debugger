function hasNonAscii(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 127) return true
  }
  return false
}

export function isLikelyStaleRef(filename: string): boolean {
  if (!filename) return true
  if (filename.startsWith('ComfyUI_temp_')) return true
  if (filename.startsWith('pasted/')) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(filename)) return true
  if (hasNonAscii(filename)) return true
  return false
}
