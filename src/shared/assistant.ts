import { parseMarkdown } from './markdown'
import type { AssistantSuggestion, TemplateId } from './types'

function uniqueSuggestions(items: AssistantSuggestion[]): AssistantSuggestion[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.target}:${item.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function createAssistantSuggestions(
  markdown: string,
  title: string,
  subtitle: string,
  templateId: TemplateId,
  seed = 0
): AssistantSuggestion[] {
  const article = parseMarkdown(markdown, templateId)
  const paragraphs = article.blocks.filter((block) => block.type === 'paragraph')
  const quotes = article.blocks.filter((block) => block.type === 'quote')
  const lists = article.blocks.filter((block) => block.type === 'list')
  const strongCount = article.blocks
    .flatMap((block) => ('children' in block ? block.children : []))
    .filter((segment) => segment.strong).length
  const textLength = paragraphs.reduce((sum, block) => sum + block.text.length, 0)

  const suggestions: AssistantSuggestion[] = [
    {
      id: `cover-${seed}-1`,
      target: 'coverPrompt',
      text: `清爽自然光、书桌、纸张、清晰中文标题，主题是“${title || '成长笔记'}”。`
    },
    {
      id: `subtitle-${seed}-1`,
      target: 'subtitle',
      text: subtitle || '在信息过载的时代，找回稳定的专注力'
    },
    {
      id: `tag-${seed}-1`,
      target: 'tag',
      text: textLength > 600 ? '深度阅读' : '轻量笔记'
    }
  ]

  if (quotes.length === 0) {
    suggestions.push({
      id: `quote-${seed}`,
      target: 'coverPrompt',
      text: '建议在正文加入 1 句引用，增强页面节奏和传播感。'
    })
  }

  if (lists.length === 0) {
    suggestions.push({
      id: `list-${seed}`,
      target: 'tag',
      text: '方法论'
    })
  }

  if (strongCount < 2) {
    suggestions.push({
      id: `strong-${seed}`,
      target: 'coverPrompt',
      text: '建议把 2-3 个核心句加粗，方便自动识别重点。'
    })
  }

  if (title.length > 18) {
    suggestions.push({
      id: `title-${seed}`,
      target: 'title',
      text: title.slice(0, 18)
    })
  }

  return uniqueSuggestions(suggestions).slice(seed % 2, seed % 2 + 3)
}
