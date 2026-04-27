export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function slugify(value: string): string {
  const ascii = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()

  if (ascii) return ascii.slice(0, 60)

  const fallback = Array.from(value.trim())
    .slice(0, 18)
    .map((char) => char.codePointAt(0)?.toString(16) ?? '')
    .filter(Boolean)
    .join('-')

  return fallback || 'untitled'
}

export function wrapTextByUnits(value: string, maxUnits: number, maxLines: number): string[] {
  const lines: string[] = []
  let current = ''
  let units = 0

  for (const char of value.trim()) {
    const charUnits = /[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/.test(char) ? 1 : 0.58
    if (current && units + charUnits > maxUnits) {
      lines.push(current)
      current = char
      units = charUnits
    } else {
      current += char
      units += charUnits
    }
    if (lines.length >= maxLines - 1) break
  }

  if (current && lines.length < maxLines) lines.push(current)
  return lines
}
