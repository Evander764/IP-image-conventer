export function parsePageRange(value: string | undefined, pageCount: number): number[] {
  const allPages = Array.from({ length: Math.max(0, pageCount) }, (_, index) => index + 1)
  const trimmed = value?.trim()
  if (!trimmed) return allPages

  const pages = new Set<number>()
  for (const part of trimmed.split(/[,，\s]+/)) {
    if (!part) continue
    const range = part.match(/^(\d+)\s*[-~]\s*(\d+)$/)
    if (range) {
      const start = Number.parseInt(range[1], 10)
      const end = Number.parseInt(range[2], 10)
      const low = Math.min(start, end)
      const high = Math.max(start, end)
      for (let page = low; page <= high; page += 1) {
        if (page >= 1 && page <= pageCount) pages.add(page)
      }
      continue
    }

    const page = Number.parseInt(part, 10)
    if (page >= 1 && page <= pageCount) pages.add(page)
  }

  return pages.size ? Array.from(pages).sort((left, right) => left - right) : allPages
}

export function pagePathIndex(path: string): number | null {
  const match = path.match(/page-(\d{3})\.png$/i)
  return match ? Number.parseInt(match[1], 10) : null
}
