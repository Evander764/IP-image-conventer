import { describe, expect, it } from 'vitest'
import { renderArticlePageHtml } from '../src/shared/html'
import { getTemplate, templateList } from '../src/shared/templates'
import { PAGE_HEIGHT, PAGE_WIDTH, type ArticleMeta, type ArticlePage } from '../src/shared/types'

describe('templates', () => {
  it('registers six new templates before the legacy templates', () => {
    expect(templateList.map((template) => template.id)).toEqual([
      'editorial-clean',
      'business-mono',
      'tech-briefing',
      'warm-column',
      'bold-opinion',
      'fresh-note',
      'shan-shui',
      'essay-notes',
      'journal-growth'
    ])
  })

  it('keeps every template at 1080x1440', () => {
    for (const template of templateList) {
      expect(template.page.width).toBe(PAGE_WIDTH)
      expect(template.page.height).toBe(PAGE_HEIGHT)
    }
  })

  it('falls back unknown template ids to editorial-clean', () => {
    expect(getTemplate('unknown-template').id).toBe('editorial-clean')
  })

  it('does not output page marks or repeated decorations in long mode', () => {
    const template = getTemplate('bold-opinion')
    const meta: ArticleMeta = {
      title: '测试标题',
      subtitle: '测试副标题',
      author: '作者',
      platform: 'xiaohongshu',
      template: template.id,
      createdAt: new Date().toISOString()
    }
    const page: ArticlePage = {
      index: 2,
      blocks: [
        {
          id: 'paragraph-1',
          type: 'paragraph',
          text: '正文内容',
          children: [{ text: '正文内容' }]
        }
      ]
    }
    const html = renderArticlePageHtml(meta, page, template, { variant: 'long', pageCount: 3 })
    expect(html).toContain('long-stitch')
    expect(html).not.toContain('class="decor page-mark"')
    expect(html).not.toContain('class="decor bold-number"')
  })
})
