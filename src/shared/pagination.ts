import type {
  ArticleBlock,
  ArticlePage,
  ListBlock,
  ParagraphBlock,
  QuoteBlock,
  RenderableBlock,
  RichTextSegment,
  TemplateConfig,
  TextStyleConfig
} from './types'

const MIN_HEADING_FOLLOW_HEIGHT = 160

function contentWidth(template: TemplateConfig): number {
  return template.page.width - template.page.paddingLeft - template.page.paddingRight
}

function contentHeight(template: TemplateConfig): number {
  return (
    template.page.height -
    template.page.paddingTop -
    template.page.paddingBottom -
    template.page.contentTopOffset
  )
}

function textUnits(value: string): number {
  let units = 0
  for (const char of value) {
    if (char === '\n') {
      units += 2
    } else if (/[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/.test(char)) {
      units += 1
    } else if (/\s/.test(char)) {
      units += 0.35
    } else {
      units += 0.58
    }
  }
  return units
}

function richTextToString(segments: RichTextSegment[]): string {
  return segments.map((segment) => segment.text).join('')
}

function estimateLineCount(value: string, style: TextStyleConfig, width: number): number {
  const charsPerLine = Math.max(8, Math.floor(width / (style.fontSize * 0.98)))
  return value
    .split('\n')
    .map((line) => Math.max(1, Math.ceil(textUnits(line) / charsPerLine)))
    .reduce((sum, lineCount) => sum + lineCount, 0)
}

function headingStyle(block: RenderableBlock, template: TemplateConfig): TextStyleConfig {
  if (block.type !== 'heading') return template.typography.paragraph
  if (block.level === 1) return template.typography.h1
  if (block.level === 2) return template.typography.h2
  return template.typography.h3
}

export function estimateBlockHeight(block: RenderableBlock, template: TemplateConfig): number {
  const width = contentWidth(template)

  if (block.type === 'heading') {
    const style = headingStyle(block, template)
    const lineCount = estimateLineCount(block.text, style, block.level === 1 ? width * 0.82 : width)
    const extra = block.level === 1 ? 74 : block.level === 2 ? 46 : 28
    return lineCount * style.fontSize * style.lineHeight + style.marginBottom + extra
  }

  if (block.type === 'paragraph') {
    const style = template.typography.paragraph
    const lineCount = estimateLineCount(block.text, style, width)
    return lineCount * style.fontSize * style.lineHeight + style.marginBottom
  }

  if (block.type === 'quote') {
    const style = template.typography.quote
    const lineCount = estimateLineCount(block.text, style, width - 68)
    return lineCount * style.fontSize * style.lineHeight + style.marginBottom + 52
  }

  if (block.type === 'list') {
    const style = template.typography.list
    const itemHeight = block.items.reduce((sum, item) => {
      const text = richTextToString(item)
      return sum + estimateLineCount(text, style, width - 72) * style.fontSize * style.lineHeight + 14
    }, 0)
    return itemHeight + style.marginBottom + 18
  }

  return 44
}

function splitTextIntoSentences(value: string): string[] {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const parts = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g)
  return parts?.map((part) => part.trim()).filter(Boolean) ?? [normalized]
}

function splitLongText(value: string, maxUnits: number): string[] {
  const sentences = splitTextIntoSentences(value)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    const candidate = current ? `${current}${sentence}` : sentence
    if (textUnits(candidate) <= maxUnits || !current) {
      current = candidate
      continue
    }

    chunks.push(current)
    current = sentence
  }

  if (current) chunks.push(current)

  const hardChunks: string[] = []
  const hardLimit = Math.max(20, Math.floor(maxUnits))
  for (const chunk of chunks) {
    if (textUnits(chunk) <= maxUnits) {
      hardChunks.push(chunk)
      continue
    }

    let buffer = ''
    let bufferUnits = 0
    for (const char of chunk) {
      const charUnits = textUnits(char)
      if (buffer && bufferUnits + charUnits > hardLimit) {
        hardChunks.push(buffer)
        buffer = char
        bufferUnits = charUnits
      } else {
        buffer += char
        bufferUnits += charUnits
      }
    }
    if (buffer) hardChunks.push(buffer)
  }

  return hardChunks
}

function maxUnitsForBlock(template: TemplateConfig, style: TextStyleConfig, targetHeight: number): number {
  const width = contentWidth(template)
  const charsPerLine = Math.max(8, Math.floor(width / (style.fontSize * 0.98)))
  const lines = Math.max(2, Math.floor(targetHeight / (style.fontSize * style.lineHeight)))
  return charsPerLine * lines * 0.92
}

function splitParagraph(block: ParagraphBlock, template: TemplateConfig): ParagraphBlock[] {
  const targetHeight = contentHeight(template) * 0.58
  const maxUnits = maxUnitsForBlock(template, template.typography.paragraph, targetHeight)
  return splitLongText(block.text, maxUnits).map((text, index) => ({
    ...block,
    id: `${block.id}-part-${index + 1}`,
    text,
    children: [{ text }]
  }))
}

function splitQuote(block: QuoteBlock, template: TemplateConfig): QuoteBlock[] {
  const targetHeight = contentHeight(template) * 0.46
  const maxUnits = maxUnitsForBlock(template, template.typography.quote, targetHeight)
  return splitLongText(block.text, maxUnits).map((text, index) => ({
    ...block,
    id: `${block.id}-part-${index + 1}`,
    text,
    children: [{ text }]
  }))
}

function splitList(block: ListBlock, template: TemplateConfig): ListBlock[] {
  const result: ListBlock[] = []
  let group: RichTextSegment[][] = []
  let groupHeight = 0
  const maxHeight = contentHeight(template) * 0.72

  for (const item of block.items) {
    const single: ListBlock = { ...block, items: [item] }
    const itemHeight = estimateBlockHeight(single, template)
    if (group.length && groupHeight + itemHeight > maxHeight) {
      result.push({ ...block, id: `${block.id}-part-${result.length + 1}`, items: group })
      group = [item]
      groupHeight = itemHeight
    } else {
      group.push(item)
      groupHeight += itemHeight
    }
  }

  if (group.length) result.push({ ...block, id: `${block.id}-part-${result.length + 1}`, items: group })
  return result
}

function splitOversizedBlock(block: RenderableBlock, template: TemplateConfig): RenderableBlock[] {
  if (block.type === 'paragraph') return splitParagraph(block, template)
  if (block.type === 'quote') return splitQuote(block, template)
  if (block.type === 'list') return splitList(block, template)
  return [block]
}

function nextRenderableBlock(blocks: ArticleBlock[], startIndex: number): RenderableBlock | null {
  for (let index = startIndex; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block.type !== 'pageBreak') return block
  }
  return null
}

function createPage(index: number, blocks: RenderableBlock[]): ArticlePage {
  return { index, blocks }
}

export function paginateBlocks(blocks: ArticleBlock[], template: TemplateConfig): ArticlePage[] {
  const maxHeight = contentHeight(template)
  const pages: ArticlePage[] = []
  let currentBlocks: RenderableBlock[] = []
  let usedHeight = 0

  function flush(): void {
    if (!currentBlocks.length) return
    pages.push(createPage(pages.length + 1, currentBlocks))
    currentBlocks = []
    usedHeight = 0
  }

  function addBlock(block: RenderableBlock, currentIndex: number): void {
    const height = estimateBlockHeight(block, template)

    if (block.type === 'heading' && block.level > 1 && currentBlocks.length) {
      const next = nextRenderableBlock(blocks, currentIndex + 1)
      const nextHeight = next ? Math.min(estimateBlockHeight(next, template), MIN_HEADING_FOLLOW_HEIGHT) : 0
      if (usedHeight + height + nextHeight > maxHeight) flush()
    }

    if (height > maxHeight) {
      const parts = splitOversizedBlock(block, template)
      if (parts.length === 1 && parts[0].id === block.id) {
        if (currentBlocks.length) flush()
        currentBlocks.push(block)
        usedHeight = Math.min(height, maxHeight)
        return
      }
      for (const part of parts) {
        addBlock(part, currentIndex)
      }
      return
    }

    if (currentBlocks.length && usedHeight + height > maxHeight) flush()

    currentBlocks.push(block)
    usedHeight += height
  }

  blocks.forEach((block, index) => {
    if (block.type === 'pageBreak') {
      flush()
      return
    }
    addBlock(block, index)
  })

  flush()
  return pages.length ? pages : [createPage(1, [])]
}
