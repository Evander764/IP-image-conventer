import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { defaultTemplateId, isTemplateId } from './templates'
import type {
  ArticleBlock,
  ArticleMeta,
  HeadingBlock,
  ParsedArticle,
  RichTextSegment,
  TemplateId
} from './types'

interface MarkdownNode {
  type: string
  value?: string
  depth?: number
  ordered?: boolean
  children?: MarkdownNode[]
}

interface FrontmatterResult {
  data: Record<string, string>
  content: string
}

function createId(prefix: string, index: number): string {
  return `${prefix}-${index.toString().padStart(4, '0')}`
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function mergeSegments(segments: RichTextSegment[]): RichTextSegment[] {
  const merged: RichTextSegment[] = []

  for (const segment of segments) {
    if (!segment.text) continue
    const previous = merged[merged.length - 1]
    if (previous && Boolean(previous.strong) === Boolean(segment.strong)) {
      previous.text += segment.text
    } else {
      merged.push({ ...segment })
    }
  }

  return merged
}

function textFromSegments(segments: RichTextSegment[]): string {
  return normalizeWhitespace(segments.map((segment) => segment.text).join(''))
}

function segmentsFromNode(node: MarkdownNode, strong = false): RichTextSegment[] {
  if (node.type === 'text' && node.value) return [{ text: node.value, strong }]
  if (node.type === 'inlineCode' && node.value) return [{ text: node.value, strong }]
  if (node.type === 'break') return [{ text: '\n', strong }]
  if (node.type === 'strong') {
    return mergeSegments((node.children ?? []).flatMap((child) => segmentsFromNode(child, true)))
  }
  if (node.children?.length) {
    return mergeSegments(node.children.flatMap((child) => segmentsFromNode(child, strong)))
  }
  return []
}

function segmentsFromBlockChildren(node: MarkdownNode): RichTextSegment[] {
  return mergeSegments((node.children ?? []).flatMap((child) => segmentsFromNode(child)))
}

function segmentsFromListItem(node: MarkdownNode): RichTextSegment[] {
  const segments: RichTextSegment[] = []

  for (const child of node.children ?? []) {
    if (child.type === 'paragraph') {
      if (segments.length) segments.push({ text: ' ' })
      segments.push(...segmentsFromBlockChildren(child))
    } else if (child.type === 'list') {
      for (const nested of child.children ?? []) {
        if (segments.length) segments.push({ text: ' ' })
        segments.push(...segmentsFromListItem(nested))
      }
    } else {
      segments.push(...segmentsFromNode(child))
    }
  }

  return mergeSegments(segments)
}

function segmentsFromBlockquote(node: MarkdownNode): RichTextSegment[] {
  const segments: RichTextSegment[] = []

  for (const child of node.children ?? []) {
    if (child.type === 'paragraph' || child.type === 'heading') {
      if (segments.length) segments.push({ text: '\n' })
      segments.push(...segmentsFromBlockChildren(child))
    } else if (child.type === 'list') {
      for (const item of child.children ?? []) {
        if (segments.length) segments.push({ text: '\n' })
        segments.push(...segmentsFromListItem(item))
      }
    }
  }

  return mergeSegments(segments)
}

function frontmatterTemplate(value: unknown, fallback: TemplateId): TemplateId {
  return isTemplateId(value) ? value : fallback
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseFrontmatter(markdown: string): FrontmatterResult {
  const normalized = markdown.replace(/^\uFEFF/, '')
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return { data: {}, content: markdown }

  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf(':')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    const value = stripQuotes(trimmed.slice(separator + 1))
    data[key] = value
  }

  return {
    data,
    content: normalized.slice(match[0].length)
  }
}

export function parseMarkdown(markdown: string, fallbackTemplate: TemplateId = defaultTemplateId): ParsedArticle {
  const parsedMatter = parseFrontmatter(markdown)
  const tree = unified().use(remarkParse).parse(parsedMatter.content) as MarkdownNode
  const blocks: ArticleBlock[] = []
  let sequence = 0

  for (const child of tree.children ?? []) {
    sequence += 1
    if (child.type === 'heading') {
      const level = Math.min(Math.max(child.depth ?? 2, 1), 3) as 1 | 2 | 3
      const segments = segmentsFromBlockChildren(child)
      const text = textFromSegments(segments)
      if (text) {
        blocks.push({
          id: createId('heading', sequence),
          type: 'heading',
          level,
          text,
          children: segments
        })
      }
      continue
    }

    if (child.type === 'paragraph') {
      const segments = segmentsFromBlockChildren(child)
      const text = textFromSegments(segments)
      if (text) {
        blocks.push({
          id: createId('paragraph', sequence),
          type: 'paragraph',
          text,
          children: segments
        })
      }
      continue
    }

    if (child.type === 'blockquote') {
      const segments = segmentsFromBlockquote(child)
      const text = textFromSegments(segments)
      if (text) {
        blocks.push({
          id: createId('quote', sequence),
          type: 'quote',
          text,
          children: segments
        })
      }
      continue
    }

    if (child.type === 'list') {
      const items = (child.children ?? [])
        .map((item) => segmentsFromListItem(item))
        .filter((item) => textFromSegments(item).length > 0)

      if (items.length) {
        blocks.push({
          id: createId('list', sequence),
          type: 'list',
          ordered: Boolean(child.ordered),
          items
        })
      }
      continue
    }

    if (child.type === 'thematicBreak') {
      blocks.push({
        id: createId('page-break', sequence),
        type: 'pageBreak'
      })
    }
  }

  const firstTitle = blocks.find(
    (block): block is HeadingBlock => block.type === 'heading' && block.level === 1
  )
  const data = parsedMatter.data
  const meta: Partial<ArticleMeta> = {
    title: String(data.title ?? firstTitle?.text ?? '未命名文章'),
    subtitle: data.subtitle ? String(data.subtitle) : undefined,
    author: data.author ? String(data.author) : undefined,
    platform: 'xiaohongshu',
    template: frontmatterTemplate(data.template ?? data.style, fallbackTemplate),
    createdAt: new Date().toISOString()
  }

  return { meta, blocks }
}
